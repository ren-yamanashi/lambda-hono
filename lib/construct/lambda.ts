import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { DatabaseConnectionInfo, NodejsFunctionWithConnectPrisma } from './private/prisma-function';

interface LambdaConstructProps {
  vpc: ec2.IVpc;
  securityGroups: ec2.ISecurityGroup[];
  database: DatabaseConnectionInfo;
  resourceName: string;
  logGroup: logs.ILogGroup;
}

export class LambdaConstruct extends Construct {
  public readonly honoLambdaFn: lambdaNodejs.NodejsFunction;
  public readonly migrateLambdaFn: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const commonDatabaseConnectionProps: lambdaNodejs.NodejsFunctionProps = {
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      vpc: props.vpc,
      securityGroups: props.securityGroups,
    };

    // NOTE: API Gatewayから呼び出されるLambda関数
    this.honoLambdaFn = new NodejsFunctionWithConnectPrisma(this, 'HonoLambda', {
      functionName: `${props.resourceName}-hono`,
      entry: 'backend/index.ts',
      handler: 'handler',
      database: props.database,
      ...commonDatabaseConnectionProps,
    });

    // NOTE: マイグレーション用のLambda関数
    this.migrateLambdaFn = new NodejsFunctionWithConnectPrisma(this, 'MigrateLambda', {
      functionName: `${props.resourceName}-migrate`,
      entry: 'backend/migrate.ts',
      handler: 'handler',
      database: props.database,
      ...commonDatabaseConnectionProps,
    });

    this.honoLambdaFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
  }
}
