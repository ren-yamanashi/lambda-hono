import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface SecurityGroupConstructProps {
  vpc: Vpc;
  resourceName: string;
}

export class SecurityGroupConstruct extends Construct {
  public readonly lambdaSecurityGroup: SecurityGroup;
  public readonly efsSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupConstructProps) {
    super(scope, id);

    this.lambdaSecurityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      securityGroupName: `${props.resourceName}-lambda-sg`,
      description: 'Allow all inbound and outbound traffic.',
      allowAllOutbound: true,
    });

    this.efsSecurityGroup = new SecurityGroup(this, 'EfsSecurityGroup', {
      vpc: props.vpc,
      securityGroupName: `${props.resourceName}-efs-sg`,
      description: 'Allow Lambda inbound traffic. Allow all outbound traffic.',
    });

    this.efsSecurityGroup.addIngressRule(
      Peer.securityGroupId(this.lambdaSecurityGroup.securityGroupId),
      Port.tcp(2049),
      'Allow Lambda to access EFS',
    );
  }
}
