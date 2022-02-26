"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
class AwsStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const appName = 'MyApp';
        // Construct an S3 asset from the ZIP located from directory up.
        const zipArchive = new aws_cdk_lib_1.aws_s3_assets.Asset(this, `${appName}Zip`, {
            path: `${__dirname}/../app.zip`,
        });
        const app = new aws_cdk_lib_1.aws_elasticbeanstalk.CfnApplication(this, `${appName}Application`, {
            applicationName: appName,
        });
        // Example of some options which can be configured
        const optionSettingProperties = [
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
        const appVersionProps = new aws_cdk_lib_1.aws_elasticbeanstalk.CfnApplicationVersion(this, `${appName}Version`, {
            applicationName: appName,
            sourceBundle: {
                s3Bucket: zipArchive.s3BucketName,
                s3Key: zipArchive.s3ObjectKey,
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const elbEnv = new aws_cdk_lib_1.aws_elasticbeanstalk.CfnEnvironment(this, `${appName}Environment`, {
            environmentName: 'MySampleEnvironment',
            applicationName: app.applicationName || appName,
            solutionStackName: '64bit Amazon Linux 2018.03 v4.11.0 running Node.js',
            optionSettings: optionSettingProperties,
            // This line is critical - reference the label created in this same stack
            versionLabel: appVersionProps.ref,
        });
        // Also very important - make sure that `app` exists before creating an app version
        appVersionProps.addDependsOn(app);
    }
}
exports.AwsStack = AwsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFxRjtBQUdyRixNQUFhLFFBQVMsU0FBUSxtQkFBSztJQUNqQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUV4QixnRUFBZ0U7UUFDaEUsTUFBTSxVQUFVLEdBQUcsSUFBSSwyQkFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxPQUFPLEtBQUssRUFBRTtZQUNoRSxJQUFJLEVBQUUsR0FBRyxTQUFTLGFBQWE7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxHQUFHLEdBQUcsSUFBSSxrQ0FBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEdBQUcsT0FBTyxhQUFhLEVBQUU7WUFDL0UsZUFBZSxFQUFFLE9BQU87U0FDM0IsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE1BQU0sdUJBQXVCLEdBQWdFO1lBQzNGO2dCQUNJLFNBQVMsRUFBRSxxQ0FBcUM7Z0JBQ2hELFVBQVUsRUFBRSxjQUFjO2dCQUMxQixLQUFLLEVBQUUsVUFBVTthQUNwQjtZQUNEO2dCQUNJLFNBQVMsRUFBRSxxQ0FBcUM7Z0JBQ2hELFVBQVUsRUFBRSxvQkFBb0I7Z0JBQ2hDLDBGQUEwRjtnQkFDMUYsMkVBQTJFO2dCQUMzRSwrQ0FBK0M7Z0JBQy9DLEtBQUssRUFBRSwrQkFBK0I7YUFDekM7WUFDRDtnQkFDSSxTQUFTLEVBQUUsdUNBQXVDO2dCQUNsRCxVQUFVLEVBQUUsYUFBYTtnQkFDekIsS0FBSyxFQUFFLFNBQVM7YUFDbkI7U0FDRixDQUFDO1FBRUYsd0RBQXdEO1FBQ3hELHVFQUF1RTtRQUN2RSxNQUFNLGVBQWUsR0FBRyxJQUFJLGtDQUFvQixDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxHQUFHLE9BQU8sU0FBUyxFQUFFO1lBQ2hHLGVBQWUsRUFBRSxPQUFPO1lBQ3hCLFlBQVksRUFBRTtnQkFDVixRQUFRLEVBQUUsVUFBVSxDQUFDLFlBQVk7Z0JBQ2pDLEtBQUssRUFBRSxVQUFVLENBQUMsV0FBVzthQUNoQztTQUNGLENBQUMsQ0FBQztRQUVILDZEQUE2RDtRQUM3RCxNQUFNLE1BQU0sR0FBRyxJQUFJLGtDQUFvQixDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxPQUFPLGFBQWEsRUFBRTtZQUNwRixlQUFlLEVBQUUscUJBQXFCO1lBQ3RDLGVBQWUsRUFBRSxHQUFHLENBQUMsZUFBZSxJQUFJLE9BQU87WUFDL0MsaUJBQWlCLEVBQUUsb0RBQW9EO1lBQ3ZFLGNBQWMsRUFBRSx1QkFBdUI7WUFDdkMseUVBQXlFO1lBQ3pFLFlBQVksRUFBRSxlQUFlLENBQUMsR0FBRztTQUNsQyxDQUFDLENBQUM7UUFFSCxtRkFBbUY7UUFDbkYsZUFBZSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVwQyxDQUFDO0NBQ0Y7QUE3REQsNEJBNkRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYXdzX2VsYXN0aWNiZWFuc3RhbGssIGF3c19zM19hc3NldHMsIFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjbGFzcyBBd3NTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBhcHBOYW1lID0gJ015QXBwJztcblxuICAgIC8vIENvbnN0cnVjdCBhbiBTMyBhc3NldCBmcm9tIHRoZSBaSVAgbG9jYXRlZCBmcm9tIGRpcmVjdG9yeSB1cC5cbiAgICBjb25zdCB6aXBBcmNoaXZlID0gbmV3IGF3c19zM19hc3NldHMuQXNzZXQodGhpcywgYCR7YXBwTmFtZX1aaXBgLCB7XG4gICAgICBwYXRoOiBgJHtfX2Rpcm5hbWV9Ly4uL2FwcC56aXBgLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXBwID0gbmV3IGF3c19lbGFzdGljYmVhbnN0YWxrLkNmbkFwcGxpY2F0aW9uKHRoaXMsIGAke2FwcE5hbWV9QXBwbGljYXRpb25gLCB7XG4gICAgICAgIGFwcGxpY2F0aW9uTmFtZTogYXBwTmFtZSxcbiAgICB9KTtcblxuICAgIC8vIEV4YW1wbGUgb2Ygc29tZSBvcHRpb25zIHdoaWNoIGNhbiBiZSBjb25maWd1cmVkXG4gICAgY29uc3Qgb3B0aW9uU2V0dGluZ1Byb3BlcnRpZXM6IGF3c19lbGFzdGljYmVhbnN0YWxrLkNmbkVudmlyb25tZW50Lk9wdGlvblNldHRpbmdQcm9wZXJ0eVtdID0gW1xuICAgICAge1xuICAgICAgICAgIG5hbWVzcGFjZTogJ2F3czphdXRvc2NhbGluZzpsYXVuY2hjb25maWd1cmF0aW9uJyxcbiAgICAgICAgICBvcHRpb25OYW1lOiAnSW5zdGFuY2VUeXBlJyxcbiAgICAgICAgICB2YWx1ZTogJ3QzLnNtYWxsJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgICAgbmFtZXNwYWNlOiAnYXdzOmF1dG9zY2FsaW5nOmxhdW5jaGNvbmZpZ3VyYXRpb24nLFxuICAgICAgICAgIG9wdGlvbk5hbWU6ICdJYW1JbnN0YW5jZVByb2ZpbGUnLFxuICAgICAgICAgIC8vIEhlcmUgeW91IGNvdWxkIHJlZmVyZW5jZSBhbiBpbnN0YW5jZSBwcm9maWxlIGJ5IEFSTiAoZS5nLiBteUlhbUluc3RhbmNlUHJvZmlsZS5hdHRyQXJuKVxuICAgICAgICAgIC8vIEZvciB0aGUgZGVmYXVsdCBzZXR1cCwgbGVhdmUgdGhpcyBhcyBpcyAoaXQgaXMgYXNzdW1lZCB0aGlzIHJvbGUgZXhpc3RzKVxuICAgICAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS81NTAzMzY2My82ODk0NjcwXG4gICAgICAgICAgdmFsdWU6ICdhd3MtZWxhc3RpY2JlYW5zdGFsay1lYzItcm9sZScsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAgIG5hbWVzcGFjZTogJ2F3czplbGFzdGljYmVhbnN0YWxrOmNvbnRhaW5lcjpub2RlanMnLFxuICAgICAgICAgIG9wdGlvbk5hbWU6ICdOb2RlVmVyc2lvbicsXG4gICAgICAgICAgdmFsdWU6ICcxNi4xMy4yJyxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIC8vIENyZWF0ZSBhbiBhcHAgdmVyc2lvbiBmcm9tIHRoZSBTMyBhc3NldCBkZWZpbmVkIGFib3ZlXG4gICAgLy8gVGhlIFMzIFwicHV0T2JqZWN0XCIgd2lsbCBvY2N1ciBmaXJzdCBiZWZvcmUgQ0YgZ2VuZXJhdGVzIHRoZSB0ZW1wbGF0ZVxuICAgIGNvbnN0IGFwcFZlcnNpb25Qcm9wcyA9IG5ldyBhd3NfZWxhc3RpY2JlYW5zdGFsay5DZm5BcHBsaWNhdGlvblZlcnNpb24odGhpcywgYCR7YXBwTmFtZX1WZXJzaW9uYCwge1xuICAgICAgYXBwbGljYXRpb25OYW1lOiBhcHBOYW1lLFxuICAgICAgc291cmNlQnVuZGxlOiB7XG4gICAgICAgICAgczNCdWNrZXQ6IHppcEFyY2hpdmUuczNCdWNrZXROYW1lLFxuICAgICAgICAgIHMzS2V5OiB6aXBBcmNoaXZlLnMzT2JqZWN0S2V5LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICBjb25zdCBlbGJFbnYgPSBuZXcgYXdzX2VsYXN0aWNiZWFuc3RhbGsuQ2ZuRW52aXJvbm1lbnQodGhpcywgYCR7YXBwTmFtZX1FbnZpcm9ubWVudGAsIHtcbiAgICAgIGVudmlyb25tZW50TmFtZTogJ015U2FtcGxlRW52aXJvbm1lbnQnLFxuICAgICAgYXBwbGljYXRpb25OYW1lOiBhcHAuYXBwbGljYXRpb25OYW1lIHx8IGFwcE5hbWUsXG4gICAgICBzb2x1dGlvblN0YWNrTmFtZTogJzY0Yml0IEFtYXpvbiBMaW51eCAyMDE4LjAzIHY0LjExLjAgcnVubmluZyBOb2RlLmpzJyxcbiAgICAgIG9wdGlvblNldHRpbmdzOiBvcHRpb25TZXR0aW5nUHJvcGVydGllcyxcbiAgICAgIC8vIFRoaXMgbGluZSBpcyBjcml0aWNhbCAtIHJlZmVyZW5jZSB0aGUgbGFiZWwgY3JlYXRlZCBpbiB0aGlzIHNhbWUgc3RhY2tcbiAgICAgIHZlcnNpb25MYWJlbDogYXBwVmVyc2lvblByb3BzLnJlZixcbiAgICB9KTtcblxuICAgIC8vIEFsc28gdmVyeSBpbXBvcnRhbnQgLSBtYWtlIHN1cmUgdGhhdCBgYXBwYCBleGlzdHMgYmVmb3JlIGNyZWF0aW5nIGFuIGFwcCB2ZXJzaW9uXG4gICAgYXBwVmVyc2lvblByb3BzLmFkZERlcGVuZHNPbihhcHApO1xuICAgIFxuICB9XG59XG4iXX0=