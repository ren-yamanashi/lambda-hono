import { IpAddresses, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface VpcConstructProps {
  resourceName: string;
}

export class VpcConstruct extends Construct {
  public readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    this.vpc = new Vpc(this, 'VPC', {
      vpcName: `${props.resourceName}-vpc`,
      ipAddresses: IpAddresses.cidr('192.168.0.0/24'),
      // NOTE: プライベートサブネットのみを作成。ISOLATEDなので、NAT ゲートウェイは作成されない
      subnetConfiguration: [
        {
          cidrMask: 26,
          name: 'isolated',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
      maxAzs: 2,
    });
  }
}
