import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { ApiGatewayConstruct } from './construct/api-gateway';
import { LambdaConstruct } from './construct/lambda';
import { RdsConstruct } from './construct/rds';
import { SecurityGroupConstruct } from './construct/security-group';
import { VpcConstruct } from './construct/vpc';

export class LambdaHonoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, resourceName: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const logGroup = new logs.LogGroup(this, 'CustomLogGroup', {
      logGroupName: `lambda/${resourceName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const vpcConstruct = new VpcConstruct(this, 'Vpc', { resourceName });

    const securityGroupConstruct = new SecurityGroupConstruct(this, 'SecurityGroup', {
      vpc: vpcConstruct.vpc,
      resourceName,
    });

    const rdsConstruct = new RdsConstruct(this, 'Rds', {
      vpc: vpcConstruct.vpc,
      resourceName,
    });
    const secret = rdsConstruct.cluster.secret;
    if (!secret) throw new Error('Secret not found');

    const lambdaConstruct = new LambdaConstruct(this, 'Lambda', {
      vpc: vpcConstruct.vpc,
      securityGroups: [securityGroupConstruct.lambdaSecurityGroup],
      database: {
        // NOTE: ここでシークレットのみを使用すると値の更新に失敗するため、ホストとポートには直接参照を使用する
        // https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/369
        host: rdsConstruct.cluster.clusterEndpoint.hostname,
        port: cdk.Token.asString(rdsConstruct.cluster.clusterEndpoint.port),
        // NOTE: `toString()`を使用する場合は、`unsafeUnwrap()`を使用しないとエラーになる
        // https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_core.SecretValue.html#unsafewbrunwrap
        engine: secret.secretValueFromJson('engine').unsafeUnwrap().toString(),
        username: secret.secretValueFromJson('username').unsafeUnwrap().toString(),
        password: secret.secretValueFromJson('password').unsafeUnwrap().toString(),
        dbname: secret.secretValueFromJson('dbname').unsafeUnwrap().toString(),
      },
      resourceName,
      logGroup,
    });

    rdsConstruct.allowInboundAccess(securityGroupConstruct.lambdaSecurityGroup);

    new ApiGatewayConstruct(this, 'ApiGateway', {
      handler: lambdaConstruct.honoLambdaFn,
      resourceName,
    });
  }
}
