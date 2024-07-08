import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

import { Construct } from 'constructs';

interface RdsConstructProps {
  readonly vpc: ec2.IVpc;
  readonly resourceName: string;
}

export class RdsConstruct extends Construct {
  public readonly instance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: RdsConstructProps) {
    super(scope, id);

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16_2,
    });
    const credentials = rds.Credentials.fromGeneratedSecret('cdk_test_user', {
      secretName: `/${props.resourceName}/rds/`,
    });

    const instance = new rds.DatabaseInstance(this, 'RdsInstance', {
      engine,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      credentials,
      databaseName: 'cdk_test_db',
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({
        subnets: props.vpc.isolatedSubnets.concat(props.vpc.privateSubnets),
      }),
      availabilityZone: 'ap-northeast-1a',
      storageEncrypted: true,
      storageType: rds.StorageType.GP2,
      // NOTE: GP2で利用できる最小のストレージサイズを選択
      // https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/CHAP_Storage.html
      allocatedStorage: 5,
      maxAllocatedStorage: 10,
    });

    this.instance = instance;
  }

  allowInboundAccess(peer: ec2.IPeer) {
    this.instance.connections.allowDefaultPortFrom(peer);
  }
}
