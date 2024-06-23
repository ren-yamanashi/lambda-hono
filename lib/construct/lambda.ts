import { Duration } from 'aws-cdk-lib';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AccessPoint } from 'aws-cdk-lib/aws-efs';

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  DatabaseConnectionProps,
  NodejsFunctionWithConnectPrisma,
} from './private/prisma-function';

interface LambdaConstructProps {
  vpc: Vpc;
  securityGroups: SecurityGroup[];
  accessPoint: AccessPoint;
  resourceName: string;
  logGroup: LogGroup;
}

export class LambdaConstruct extends Construct {
  public readonly honoLambdaFn: NodejsFunction;
  public readonly migrateLambdaFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const commonDatabaseConnectionProps: DatabaseConnectionProps = {
      memorySize: 256,
      timeout: Duration.seconds(15),
      vpc: props.vpc,
      securityGroups: props.securityGroups,
      accessPoint: props.accessPoint,
      mountPath: '/mnt/efs',
      databaseUrl: 'file:/mnt/efs/prisma/dev.db',
    };

    // NOTE: API Gatewayから呼び出されるLambda関数
    this.honoLambdaFn = new NodejsFunctionWithConnectPrisma(this, 'HonoLambda', {
      functionName: `${props.resourceName}-lambda`,
      entry: 'backend/index.ts',
      handler: 'handler',
      ...commonDatabaseConnectionProps,
    });

    // NOTE: マイグレーション用のLambda関数
    this.migrateLambdaFn = new NodejsFunctionWithConnectPrisma(this, 'MigrateLambda', {
      functionName: `${props.resourceName}-migrate`,
      entry: 'backend/migrate.ts',
      handler: 'handler',
      ...commonDatabaseConnectionProps,
    });

    this.honoLambdaFn.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });
  }

  /**
   * 指定されたポリシーをラムダ関数のロールに割り当てる
   * @param {PolicyStatement} policy 割り当てるポリシー
   */
  public assignRolePolicy(policy: PolicyStatement): void {
    this.honoLambdaFn.addToRolePolicy(policy);
    this.migrateLambdaFn.addToRolePolicy(policy);
  }
}
