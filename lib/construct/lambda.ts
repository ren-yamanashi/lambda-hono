import { Duration } from 'aws-cdk-lib';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AccessPoint } from 'aws-cdk-lib/aws-efs';

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
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

    // NOTE: will be called by the API Gateway
    this.honoLambdaFn = new NodejsFunctionWithConnectPrisma(this, 'HonoLambda', {
      functionName: `${props.resourceName}-lambda`,
      entry: 'backend/index.ts',
      handler: 'handler',
      ...commonDatabaseConnectionProps,
    });

    // NOTE: will be used to migrate the database
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
   * Assigns the given policy to the role of the lambda functions.
   * @param {PolicyStatement} policy The policy to assign
   */
  public assignRolePolicy(policy: PolicyStatement): void {
    this.honoLambdaFn.addToRolePolicy(policy);
    this.migrateLambdaFn.addToRolePolicy(policy);
  }
}
