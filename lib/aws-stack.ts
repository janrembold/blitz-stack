import {
  aws_ec2,
  aws_elasticache,
  aws_elasticbeanstalk,
  aws_iam,
  aws_s3_assets,
  Stack,
  StackProps,
  CfnOutput
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class AwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appName = 'blitz';

    /**
     * VPC - stick with default or go fully private isolated?
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
      // subnetIds: vpc.isolatedSubnets.map(function (subnet) {
      //   return subnet.subnetId;
      // }),
      subnetIds: vpc.privateSubnets.map(({subnetId}) => subnetId)
    });

    // The security group that defines network level access to the cluster
    const securityGroup = new aws_ec2.SecurityGroup(this, `${appName}-security-group`, {
      allowAllOutbound: true,
      vpc: vpc,      
    });

    // securityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(6379), 'Redis from anywhere');
    securityGroup.addIngressRule(aws_ec2.Peer.ipv4('10.0.0.0/24'), aws_ec2.Port.tcp(6379), 'Redis from 10.0.0.0/24 only');
    
    // TODO: both variations are not enough (or not correct) to connect from beanstalk to redis

    // new aws_ec2.Connections({
    //     securityGroups: [securityGroup],
    //     defaultPort: aws_ec2.Port.tcp(6379)
    // });

    // const ecSecurityGroup = new aws_ec2.SecurityGroup(this, 'ElastiCacheSG', {
    //   vpc: vpc,
    //   description: 'SecurityGroup associated with the ElastiCache Redis Cluster',
    //   allowAllOutbound: false,
    // });

    // ecSecurityGroup.connections.allowFrom(securityGroup, aws_ec2.Port.tcp(6379), 'Redis ingress 6379');
    // ecSecurityGroup.connections.allowTo(securityGroup, aws_ec2.Port.tcp(6379), 'Redis egress 6379');


    
    // The cluster resource itself
    const cluster = new aws_elasticache.CfnCacheCluster(this, `${appName}-cluster`, {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [
        securityGroup.securityGroupId, 
        // ecSecurityGroup.securityGroupId
      ],
    });

    // TODO: next level would be Redis auto scaling - but this is only available for much larger nodes:
    // https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/AutoScaling.html




    /**
     * Elastic Beanstalk Application
     */
    const app = new aws_elasticbeanstalk.CfnApplication(this, `${appName}-eb-application`, {
      applicationName: appName,
    });

    const EbInstanceRole = new aws_iam.Role(this, `${appName}-aws-elasticbeanstalk-ec2-role`, {
      assumedBy: new aws_iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    
    const managedPolicy = aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier')
    EbInstanceRole.addManagedPolicy(managedPolicy);
    
    const profileName = `${appName}-elasticbeanstalk-instance-profile`
    new aws_iam.CfnInstanceProfile(this, profileName, {
      instanceProfileName: profileName,
      roles: [
        EbInstanceRole.roleName
      ]
    });

    // Example of some options which can be configured
    const optionSettings: aws_elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'InstanceType',
        value: 't2.micro',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MinSize',
        value: '1',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MaxSize',
        value: '2',
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: profileName
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

    // Construct an S3 asset from the ZIP located from directory up.
    const zipArchive = new aws_s3_assets.Asset(this, `${appName}-s3-zip`, {
      path: `${__dirname}/../nodejs.zip`,
    });

    // Create an app version from the S3 asset defined above
    // The S3 "putObject" will occur first before CF generates the template
    const appVersionProps = new aws_elasticbeanstalk.CfnApplicationVersion(
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

    // TODO: I think this env also needs a security group!?
    const elbEnv = new aws_elasticbeanstalk.CfnEnvironment(this, `${appName}-environment`, {
      // environmentName: 'MySampleEnvironment',
      applicationName: app.applicationName || appName,
      solutionStackName: '64bit Amazon Linux 2 v5.4.10 running Node.js 14',
      optionSettings: optionSettings,
      // This line is critical - reference the label created in this same stack
      versionLabel: appVersionProps.ref,
    });

    // Also very important - make sure that `app` exists before creating an app version
    appVersionProps.addDependsOn(app);

    // new CfnOutput(this, 'beanstalkEndpointUrl', { value: elbEnv.attrEndpointUrl });
    // new CfnOutput(this, 'redisEndpointUrl', { value: cluster.attrRedisEndpointAddress });
    // new CfnOutput(this, 'redisEndpointPort', { value: cluster.attrRedisEndpointPort });
  }
}
