import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { ApiGatewayConstruct } from './construct/api-gateway';
import { ErrorAlarmConstruct } from './construct/error-alarm';
import { LambdaConstruct } from './construct/lambda';
import { RdsConstruct } from './construct/rds';
import { SecurityGroupConstruct } from './construct/security-group';
import { VpcConstruct } from './construct/vpc';

export class LambdaRdsStack extends cdk.Stack {
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
    const secret = rdsConstruct.instance.secret;
    if (!secret) throw new Error('Rds secret not found.');

    const lambdaConstruct = new LambdaConstruct(this, 'Lambda', {
      vpc: vpcConstruct.vpc,
      securityGroups: [securityGroupConstruct.lambdaSecurityGroup],
      database: {
        // NOTE: ここでシークレットのみを使用すると値の更新に失敗するため、ホストとポートには直接参照を使用する
        // https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/369
        host: rdsConstruct.instance.instanceEndpoint.hostname,
        port: cdk.Token.asString(rdsConstruct.instance.instanceEndpoint.port),
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

    const errorAlarm = new ErrorAlarmConstruct(this, 'ErrorAlarm', { logGroup, resourceName });

    // NOTE: CloudWatchからSNSに対してパブリッシュを許可
    const snsPublishPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudwatch.amazonaws.com')],
      actions: ['sns:Publish'],
      resources: [errorAlarm.topicArn],
    });

    errorAlarm.addResourcePolicy(snsPublishPolicy);
  }
}
