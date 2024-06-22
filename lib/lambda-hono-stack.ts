import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { IpAddresses, Vpc ,SubnetType} from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as iam from 'aws-cdk-lib/aws-iam';
export class LambdaHonoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, resourceName:string, props?: cdk.StackProps,) {
    super(scope, id, props);

    // NOTE: Definition of VPC
    const vpc = new Vpc(this, 'VPC', {
      vpcName: `${resourceName}-vpc`,
      ipAddresses: IpAddresses.cidr("192.168.0.0/24"),
      // Create only a privateSubnet. Since it is isolated, no NAT Gateway is created.
      subnetConfiguration: [
        {
          cidrMask: 26,
          name: "efs",
          subnetType: SubnetType.PRIVATE_ISOLATED
        }
      ],
      maxAzs: 2
    })

    // NOTE: Definition of EFS
    const fileSystem = new efs.FileSystem(this, "FileSystem", {
      vpc,
      // files are not transitioned to infrequent access (IA) storage by default
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      // files are not transitioned back from (infrequent access) IA to primary storage by default
      outOfInfrequentAccessPolicy: efs.OutOfInfrequentAccessPolicy.AFTER_1_ACCESS
    })

    // NOTE: Add EFS Access Point
    const accessPoint = fileSystem.addAccessPoint('AccessPoint', {
      // set /export/lambda as the root of the access point
      path: '/export/lambda',
      // as /export/lambda does not exist in a new efs filesystem, the efs will create the directory with the following createAcl
      createAcl: {
        ownerGid: '1001',
        ownerUid: '1001',
        permissions: '750',
      },
      // enforce the POSIX identity so lambda function will access with this identity
      posixUser: {
        gid: '1001',
        uid: '1001',
      },
    })

    const lambdaFunction = new NodejsFunction(this, "lambda", {
      functionName: `${resourceName}-lambda`,
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      vpc,
      filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
      bundling: {
        forceDockerBundling: true, // lambda互換dockerコンテナ環境でTypeScriptのビルドが実行される
      },
      environment: {
        DATABASE_URL: 'file:/mnt/efs/prisma/dev.db',
      }
    })

    lambdaFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })

    // NOTE: Define API Gateway
    new apigw.LambdaRestApi(this, 'myapi', {
      handler: lambdaFunction
    })

    lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ["elasticfilesysten:*"],
      resources: [fileSystem.fileSystemArn]
    }))
  }
}
