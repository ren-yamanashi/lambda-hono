import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { ApiGatewayConstruct } from './construct/api-gateway';
import { EfsConstruct } from './construct/efs';
import { LambdaConstruct } from './construct/lambda';
import { SecurityGroupConstruct } from './construct/security-group';
import { VpcConstruct } from './construct/vpc';

export class LambdaHonoStack extends Stack {
  constructor(scope: Construct, id: string, resourceName: string, props?: StackProps) {
    super(scope, id, props);

    const logGroup = new LogGroup(this, 'CustomLogGroup', {
      logGroupName: `lambda/${resourceName}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const vpcConstruct = new VpcConstruct(this, 'Vpc', { resourceName });

    const securityGroup = new SecurityGroupConstruct(this, 'SecurityGroup', {
      vpc: vpcConstruct.vpc,
      resourceName,
    });

    const efsConstruct = new EfsConstruct(this, 'Efs', {
      vpc: vpcConstruct.vpc,
      securityGroup: securityGroup.efsSecurityGroup,
      resourceName,
    });

    const lambdaConstruct = new LambdaConstruct(this, 'Lambda', {
      vpc: vpcConstruct.vpc,
      securityGroups: [securityGroup.lambdaSecurityGroup],
      accessPoint: efsConstruct.accessPoint,
      resourceName,
      logGroup,
    });

    new ApiGatewayConstruct(this, 'ApiGateway', {
      handler: lambdaConstruct.honoLambdaFn,
      resourceName,
    });

    const efsPolicy = new PolicyStatement({
      actions: ['elasticfilesystem:*'],
      resources: [efsConstruct.fileSystem.fileSystemArn],
    });

    // NOTE: EFSに対するアクセス権限をLambda関数に付与
    lambdaConstruct.assignRolePolicy(efsPolicy);
  }
}
