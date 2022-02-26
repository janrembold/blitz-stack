import { aws_ec2, aws_elasticache, aws_elasticbeanstalk, aws_s3_assets, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Todo: https://github.com/aws-samples/aws-cdk-elasticache-redis-iam-rbac/blob/main/lib/redis-rbac-stack.ts#L208
export class AwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appName = 'MyApp';
    const targetVpc = new aws_ec2.Vpc(this, `${appName}Vpc`);

    // Construct an S3 asset from the ZIP located from directory up.
    const zipArchive = new aws_s3_assets.Asset(this, `${appName}Zip`, {
      path: `${__dirname}/../nodejs.zip`,
    });

    const app = new aws_elasticbeanstalk.CfnApplication(this, `${appName}Application`, {
        applicationName: appName,
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
          // Here you could reference an instance profile by ARN (e.g. myIamInstanceProfile.attrArn)
          // For the default setup, leave this as is (it is assumed this role exists)
          // https://stackoverflow.com/a/55033663/6894670
          value: 'aws-elasticbeanstalk-ec2-role',
      },
      {
          namespace: 'aws:elasticbeanstalk:container:nodejs',
          optionName: 'NodeVersion',
          value: '16.13.2',
      },
    ];

    // Create an app version from the S3 asset defined above
    // The S3 "putObject" will occur first before CF generates the template
    const appVersionProps = new aws_elasticbeanstalk.CfnApplicationVersion(this, `${appName}Version`, {
      applicationName: appName,
      sourceBundle: {
          s3Bucket: zipArchive.s3BucketName,
          s3Key: zipArchive.s3ObjectKey,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const elbEnv = new aws_elasticbeanstalk.CfnEnvironment(this, `${appName}Environment`, {
      environmentName: 'MySampleEnvironment',
      applicationName: app.applicationName || appName,
      solutionStackName: '64bit Amazon Linux 2018.03 v4.11.0 running Node.js',
      optionSettings: optionSettingProperties,
      // This line is critical - reference the label created in this same stack
      versionLabel: appVersionProps.ref,
    });

    // Also very important - make sure that `app` exists before creating an app version
    appVersionProps.addDependsOn(app);
    
    const subnetGroup = new aws_elasticache.CfnSubnetGroup(this, `${id}-subnet-group`, {
      description: `List of subnets used for redis cache ${id}`,
      subnetIds: targetVpc.privateSubnets.map(function(subnet) {
       return subnet.subnetId;
      })
     });
   
     // The security group that defines network level access to the cluster
     const securityGroup = new aws_ec2.SecurityGroup(this, `${id}-security-group`, { vpc: targetVpc });
   
     const connections = new aws_ec2.Connections({
      securityGroups: [securityGroup],
      defaultPort: new aws_ec2.Port({
        stringRepresentation: 'Redis Port',
       protocol: aws_ec2.Protocol.TCP,
       fromPort: 6379,
       toPort: 6379
      })
     });
   
     // The cluster resource itself.
     const cluster = new aws_elasticache.CfnCacheCluster(this, `${id}-cluster`, {
      cacheNodeType: 'cache.t2.micro',
      engine: 'redis',
      numCacheNodes: 1,
      autoMinorVersionUpgrade: true,
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [
       securityGroup.securityGroupId
      ]
     });
  }
}
