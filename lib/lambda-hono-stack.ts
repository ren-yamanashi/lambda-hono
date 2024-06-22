import { Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ApiGatewayConstruct } from './construct/api-gateway';
import { EfsConstruct } from './construct/efs';
import { LambdaConstruct } from './construct/lambda';
import { SecurityGroupConstruct } from './construct/security-group';
import { VpcConstruct } from './construct/vpc';

export class LambdaHonoStack extends Stack {
  constructor(scope: Construct, id: string, resourceName: string, props?: StackProps) {
    super(scope, id, props);

    const vpcConstruct = new VpcConstruct(this, 'Vpc', { resourceName });

    const securityGroup = new SecurityGroupConstruct(this, `SecurityGroup`, {
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
    });

    new ApiGatewayConstruct(this, 'ApiGateway', {
      handler: lambdaConstruct.honoLambdaFn,
      resourceName,
    });

    const efsPolicy = new PolicyStatement({
      actions: ['elasticfilesystem:*'],
      resources: [efsConstruct.fileSystem.fileSystemArn],
    });

    // NOTE: Attach the policy to all functions
    lambdaConstruct.assignRolePolicy(efsPolicy);
  }
}
