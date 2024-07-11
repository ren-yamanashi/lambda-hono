import { Token } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface PostgresRdsProps {
  readonly vpc: ec2.IVpc;
}

export class PostgresRds extends Construct {
  private readonly instance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: PostgresRdsProps) {
    super(scope, id);

    if (!process.env.DATABASE_NAME || !process.env.POSTGRES_USER) {
      throw new Error('Please set DATABASE_NAME and POSTGRES_USER in the environment variables.');
    }

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16_2,
    });

    const credentials = rds.Credentials.fromGeneratedSecret(process.env.POSTGRES_USER, {
      secretName: `/${id}/rds/`,
    });

    this.instance = new rds.DatabaseInstance(this, `${id}Instance`, {
      engine,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      credentials,
      databaseName: process.env.DATABASE_NAME,
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({
        subnets: props.vpc.isolatedSubnets.concat(props.vpc.privateSubnets),
      }),
      availabilityZone: 'ap-northeast-1a',
      storageEncrypted: true,
      storageType: rds.StorageType.GP2,
      // NOTE: Select the minimum storage size available for GP2.
      // https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/CHAP_Storage.html
      allocatedStorage: 5,
      maxAllocatedStorage: 10,
    });
  }

  public allowInboundAccess(peer: ec2.IPeer) {
    this.instance.connections.allowDefaultPortFrom(peer);
  }

  public getDatabaseUrl(): string {
    const secret = this.instance.secret;
    if (!secret) throw new Error('Rds secret not found.');

    const host = this.instance.instanceEndpoint.hostname;
    const port = Token.asString(this.instance.instanceEndpoint.port);
    // NOTE: If you use `toString()`, must use `unsafeUnwrap()` or an error will occur.
    // https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_core.SecretValue.html#unsafewbrunwrap
    const engine = secret.secretValueFromJson('engine').unsafeUnwrap().toString();
    const username = secret.secretValueFromJson('username').unsafeUnwrap().toString();
    const password = secret.secretValueFromJson('password').unsafeUnwrap().toString();
    const dbname = secret.secretValueFromJson('dbname').unsafeUnwrap().toString();

    return `${engine}://${username}:${password}@${host}:${port}/${dbname}`;
  }
}
