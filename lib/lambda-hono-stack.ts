import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { IpAddresses, Vpc ,SubnetType, SecurityGroup} from 'aws-cdk-lib/aws-ec2';
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

    const securityGroup = new SecurityGroup(this, `SecurityGroup`, {
      vpc,
    });

    // NOTE: Definition of EFS
    const fileSystem = new efs.FileSystem(this, "FileSystem", {
      vpc,
      fileSystemName: `${resourceName}-efs`,
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

    const honoLambdaFn = new NodejsFunction(this, "lambda", {
      functionName: `${resourceName}-lambda`,
      entry: 'backend/index.ts',
      handler: 'handler',
      memorySize: 256,
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(15),
      vpc,
      securityGroups: [securityGroup],
      filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
      bundling: {
        forceDockerBundling: true, // lambda互換dockerコンテナ環境でTypeScriptのビルドが実行される
        nodeModules: ["prisma", "@prisma/client"],
        commandHooks: {
          beforeInstall: (i,o) => [
            // Copy prisma directory to Lambda code asset
            // the directory must be placed on the same directory as your Lambda code
            `cp -r ${i}/prisma ${o}`,
          ],
          beforeBundling: (i,o) => [],
          afterBundling: (i,o) => [],
        }
      },
      environment: {
        DATABASE_URL: 'file:/mnt/efs/prisma/dev.db',
      },
      depsLockFilePath: 'backend/package-lock.json',
    })

    const migrateLambdaFn = new NodejsFunction(this, "MigrateLambda", {
      functionName: `${resourceName}-migrate`,
      entry: 'backend/migrate.ts',
      handler: 'handler',
      memorySize: 256,
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(15),
      vpc,
      securityGroups: [securityGroup],
      filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
      bundling: {
        forceDockerBundling: true, // lambda互換dockerコンテナ環境でTypeScriptのビルドが実行される
        nodeModules: ["prisma", "@prisma/client"],
        commandHooks: {
          beforeInstall: (i,o) => [
            // Copy prisma directory to Lambda code asset
            // the directory must be placed on the same directory as your Lambda code
            `cp -r ${i}/prisma ${o}`,
          ],
          beforeBundling: (i,o) => [],
          afterBundling: (i,o) => [],
        }
      },
      environment: {
        DATABASE_URL: 'file:/mnt/efs/prisma/dev.db',
      },
      depsLockFilePath: 'backend/package-lock.json',
    })

    honoLambdaFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })

    // NOTE: Define API Gateway
    new apigw.LambdaRestApi(this, 'myapi', {
      handler: honoLambdaFn,
      restApiName: `${resourceName}-api`,
    })

    honoLambdaFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["elasticfilesystem:*"],
      resources: [fileSystem.fileSystemArn]
    }))

    migrateLambdaFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["elasticfilesystem:*"],
      resources: [fileSystem.fileSystemArn]
    }))
  }
}
