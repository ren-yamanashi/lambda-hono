import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface SecurityGroupConstructProps {
  vpc: ec2.IVpc;
  resourceName: string;
}

export class SecurityGroupConstruct extends Construct {
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;

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
