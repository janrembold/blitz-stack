import {
  aws_cloudwatch,
  aws_ec2,
  aws_elasticache,
  aws_elasticbeanstalk,
  aws_iam,
  aws_s3_assets,
  Stack,
  StackProps,
  CfnOutput,
  Duration,
  aws_elasticloadbalancingv2,
  aws_s3,
  aws_s3_deployment,
  aws_cloudfront,
  aws_cloudfront_origins,
  RemovalPolicy
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

export class AwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appName = 'blitz';

    /**
     * VPC 
     */
    const vpc = new aws_ec2.Vpc(this, `${appName}-vpc`);

    // Network monitoring with flow logs
    // new aws_ec2.FlowLog(this, `${appName}-vpc-flow-log`, {
    //   resourceType: aws_ec2.FlowLogResourceType.fromVpc(vpc),
    // });


    /**
     * ElastiCache with Redis Cluster
     */
    const subnetGroup = new aws_elasticache.CfnSubnetGroup(this, `${appName}-subnet-group`, {
      description: `List of subnets used for redis cache ${appName}`,
      subnetIds: vpc.privateSubnets.map(({subnetId}) => subnetId)
    });

    // The security group that defines network level access to the cluster
    const securityGroup = new aws_ec2.SecurityGroup(this, `${appName}-security-group`, {
      allowAllOutbound: true,
      vpc: vpc,      
    });

    securityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(6379), 'Redis from anywhere');
    
    // The cluster resource itself
    const cluster = new aws_elasticache.CfnCacheCluster(this, `${appName}-cluster`, {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
      port: 6379,
    });

    // TODO: next level would be Redis auto scaling - but this is only available for much larger nodes:
    // https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/AutoScaling.html


    /**
     * Elastic Beanstalk Application
     */
    const ebApp = new aws_elasticbeanstalk.CfnApplication(this, `${appName}-eb-application`, {
      applicationName: appName,
    });

    // Construct an S3 asset from the ZIP located from directory up.
    const zipArchive = new aws_s3_assets.Asset(this, `${appName}-s3-zip`, {
      path: `${__dirname}/../nodejs.zip`,
    });

    const ebInstanceRole = new aws_iam.Role(this, `${appName}-aws-elasticbeanstalk-ec2-role`, {
      assumedBy: new aws_iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    
    const ebManagedPolicy = aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier')
    ebInstanceRole.addManagedPolicy(ebManagedPolicy);
    
    const ebProfileName = `${appName}-elasticbeanstalk-instance-profile`
    new aws_iam.CfnInstanceProfile(this, ebProfileName, {
      instanceProfileName: ebProfileName,
      roles: [
        ebInstanceRole.roleName
      ]
    });

    const ebSecurityGroup = new aws_ec2.SecurityGroup(this, `${appName}-elasticbeanstalk-security-group`, {
      allowAllOutbound: true,
      vpc: vpc,
    });

    ebSecurityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(80));
    ebSecurityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(443));

    // Example of some options which can be configured
    const optionSettings: aws_elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'InstanceType',
        value: 't3.micro',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'LoadBalancerType',
        value: 'network',
      },
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'StreamLogs',
        value: 'true',
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: vpc.vpcId
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'ELBSubnets',
        value: vpc.publicSubnets.map(value => value.subnetId).join(','),
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        value: vpc.privateSubnets.map(value => value.subnetId).join(','),
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MinSize',
        value: '1',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MaxSize',
        value: '3',
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: ebProfileName
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'REDIS_ENDPOINT_ADDRESS',
        value: cluster.attrRedisEndpointAddress
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'REDIS_ENDPOINT_PORT',
        value: cluster.attrRedisEndpointPort
      }
    ];

    // Create an app version from the S3 asset defined above
    const ebAppVersionProps = new aws_elasticbeanstalk.CfnApplicationVersion(
      this,
      `${appName}-eb-version-props`,
      {
        applicationName: appName,
        sourceBundle: {
          s3Bucket: zipArchive.s3BucketName,
          s3Key: zipArchive.s3ObjectKey,
        },
      },
    );

    const ebEnvironment = new aws_elasticbeanstalk.CfnEnvironment(this, `${appName}-environment`, {
      applicationName: ebApp.applicationName || appName,
      // environmentName: `${appName}-eb-env`,
      solutionStackName: '64bit Amazon Linux 2 v5.5.0 running Node.js 16',
      optionSettings: optionSettings,
      // This line is critical - reference the label created in this same stack
      versionLabel: ebAppVersionProps.ref,
    });

    // Also very important - make sure that `app` exists before creating an app version
    ebAppVersionProps.addDependsOn(ebApp);
    ebEnvironment.addDependsOn(subnetGroup);


    /**
     * Cloudfront S3 Website
     */
    const cfBucket = new aws_s3.Bucket(this, `${appName}-s3-website`, {
      accessControl: aws_s3.BucketAccessControl.PRIVATE,
      // don't use in producton mode
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    
    const originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(this, `${appName}-origin-access-identity-website`);
    cfBucket.grantRead(originAccessIdentity);
    
    const cfWebsite = new aws_cloudfront.Distribution(this, `${appName}-cf-website`, {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(cfBucket, {originAccessIdentity}),
      },
    });
    
    // new aws_s3_deployment.BucketDeployment(this, `${appName}-s3-website-bucket-deployment`, {
    //   destinationBucket: bucket,
    //   sources: [
    //     aws_s3_deployment.Source.asset(path.resolve(__dirname, './dist'))
    //   ]
    // });



    /** 
     * CloudWatch Metrics Dashboard 
     */
    const dashboard = new aws_cloudwatch.Dashboard(this, `${appName}-dashboard`, {
      dashboardName: 'Blitz-Dashboard'
    });

    const latencyWidget = new aws_cloudwatch.GraphWidget({
      width: 24,
      title: 'Blitz Dashboard',
      statistic: 'Sum',
      period: Duration.seconds(30),
      region: this.region,
      left: [
        new aws_cloudwatch.Metric({
          metricName: 'HTTPCode_Backend_2XX',
          namespace: 'AWS/ELB'
        })
      ]
    });

    dashboard.addWidgets(latencyWidget);

    /**
     * Endpoint URL Output
     */

    new CfnOutput(this, 'cloudfrontEndpointUrl', { value: cfWebsite.distributionDomainName });
    new CfnOutput(this, 'beanstalkEndpointUrl', { value: ebEnvironment.attrEndpointUrl });
    new CfnOutput(this, 'redisEndpointUrl', { value: cluster.attrRedisEndpointAddress });
    new CfnOutput(this, 'redisEndpointPort', { value: cluster.attrRedisEndpointPort });
  }
}
