import {
  aws_ec2,
  aws_elasticache,
  aws_elasticbeanstalk,
  aws_iam,
  aws_s3_assets,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Todo: https://github.com/aws-samples/aws-cdk-elasticache-redis-iam-rbac/blob/main/lib/redis-rbac-stack.ts#L208
export class AwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appName = 'blitz';


    /**
     * VPC - stick with default or go fully private isolated?
     */

    const vpc = new aws_ec2.Vpc(this, `${appName}-vpc`);

    // TODO: maybe not necessary to go PRIVATE_ISOLATED here, defaults are much simpler
    // const vpc = new aws_ec2.Vpc(this, `${appName}-vpc`, {
    //   subnetConfiguration: [
    //     {
    //       cidrMask: 24,
    //       name: 'Isolated',
    //       subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
    //     },
    //   ],
    // });

    // Network monitoring with flow logs
    new aws_ec2.FlowLog(this, `${appName}-vpc-flow-log`, {
      resourceType: aws_ec2.FlowLogResourceType.fromVpc(vpc),
    });



    /**
     * This part is maybe not even necessary as the vpc subnets for beanstalk are set inside the eb options
     */

    // TODO: this is wrong - we don't use lambda here, only ECS NodeJS instances inside Beanstalk
    // See: https://stackoverflow.com/questions/60826562/is-there-any-way-that-i-can-assign-security-group-and-vpc-to-my-web-application
    // or:  https://stackoverflow.com/questions/60521210/how-to-refer-exsisting-vpc-to-deploy-beanstalk-app-using-aws-cdk-typescript
    // const lambdaSecurityGroup = new aws_ec2.SecurityGroup(this, `${appName}-security-group`, {
    //   vpc: vpc,
    //   description: 'SecurityGroup into which Lambdas will be deployed',
    //   allowAllOutbound: false,
    // });

    // const ecSecurityGroup = new aws_ec2.SecurityGroup(
    //   this,
    //   `${appName}-elasti-cache-security-group`,
    //   {
    //     vpc: vpc,
    //     description: 'SecurityGroup associated with the ElastiCache Redis Cluster',
    //     allowAllOutbound: false,
    //   },
    // );

    // ecSecurityGroup.connections.allowFrom(
    //   lambdaSecurityGroup,
    //   aws_ec2.Port.tcp(6379),
    //   'Redis ingress 6379',
    // );
    // ecSecurityGroup.connections.allowTo(
    //   lambdaSecurityGroup,
    //   aws_ec2.Port.tcp(6379),
    //   'Redis egress 6379',
    // );
    
    // const secretsManagerVpcEndpointSecurityGroup = new aws_ec2.SecurityGroup(
    //   this,
    //   `${appName}-secrets-manager-security-group`,
    //   {
    //     vpc: vpc,
    //     description: 'SecurityGroup for the VPC Endpoint Secrets Manager',
    //     allowAllOutbound: false,
    //   },
    // );

    // secretsManagerVpcEndpointSecurityGroup.connections.allowFrom(
    //   lambdaSecurityGroup,
    //   aws_ec2.Port.tcp(443),
    // );

    // TODO: this might be used to store the redis user credentials
    // const secretsManagerEndpoint = vpc.addInterfaceEndpoint(`${appName}-secrets-manager`, {
    //   service: aws_ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    //   subnets: {
    //     subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
    //   },
    //   open: false,
    //   securityGroups: [secretsManagerVpcEndpointSecurityGroup],
    // });




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
    
    const profileName = `${appName}-InstanceProfile`
    const instanceProfile = new aws_iam.CfnInstanceProfile(this, profileName, {
      instanceProfileName: profileName,
      roles: [
        EbInstanceRole.roleName
      ]
    });

    // Example of some options which can be configured
    const optionSettingProperties: aws_elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'InstanceType',
        value: 't3.small',
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: profileName
      },
      {
        namespace: 'aws:elasticbeanstalk:container:nodejs',
        optionName: 'NodeVersion',
        value: '16.14.0',
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: vpc.vpcId,
      },
      // {
      //   namespace: 'aws:ec2:vpc',
      //   optionName: 'Subnets',
      //   value: 'subnet-1f234567'
      // },
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
      solutionStackName: '64bit Amazon Linux 2018.03 v4.11.0 running Node.js',
      optionSettings: optionSettingProperties,
      // This line is critical - reference the label created in this same stack
      versionLabel: appVersionProps.ref,
    });

    // Also very important - make sure that `app` exists before creating an app version
    appVersionProps.addDependsOn(app);



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
      vpc: vpc,
    });

    // This is not used but maybe simpler permissions for the ec2 connection permissions?
    //  const connections = new aws_ec2.Connections({
    //   securityGroups: [securityGroup],
    //   defaultPort: new aws_ec2.Port({
    //     stringRepresentation: 'Redis Port',
    //    protocol: aws_ec2.Protocol.TCP,
    //    fromPort: 6379,
    //    toPort: 6379
    //   })
    //  });

    // The cluster resource itself
    const cluster = new aws_elasticache.CfnCacheCluster(this, `${appName}-cluster`, {
      cacheNodeType: 'cache.t2.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
    });

    console.log('Cluster Address:Port', cluster.attrRedisEndpointAddress, cluster.attrRedisEndpointPort);

    // TODO: next level would be Redis auto scaling - but this is only available for much larger nodes:
    // https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/AutoScaling.html
  }
}
