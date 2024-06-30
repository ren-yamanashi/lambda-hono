import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface VpcConstructProps {
  resourceName: string;
}

export class VpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: `${props.resourceName}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr('192.168.0.0/24'),
      // NOTE: プライベートサブネットのみを作成。ISOLATEDなので、NAT ゲートウェイは作成されない
      subnetConfiguration: [
        {
          cidrMask: 26,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      maxAzs: 2,
    });
  }
}
