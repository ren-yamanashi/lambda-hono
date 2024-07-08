import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface SecurityGroupConstructProps {
  readonly vpc: ec2.IVpc;
  readonly resourceName: string;
}

export class SecurityGroupConstruct extends Construct {
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupConstructProps) {
    super(scope, id);

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      securityGroupName: `${props.resourceName}-lambda-sg`,
      description: 'Allow all inbound and outbound traffic.',
      allowAllOutbound: true,
    });
  }
}
