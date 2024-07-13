import { Stack, Token } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface PostgresRdsProps extends Omit<rds.DatabaseInstanceProps, 'engine'> {
  /**
   * Credentials for the administrative user
   *
   * @requires
   */
  readonly credentials: rds.Credentials;

  /**
   * The name of the database.
   *
   * @requires
   */
  readonly databaseName: string;

  /**
   * The name of the compute and memory capacity for the instance.
   *
   * @default - t4g.micro
   */
  instanceType?: ec2.InstanceType;

  /**
   * The allocated storage size, specified in gibibytes (GiB).
   *
   * @default 5
   */
  readonly allocatedStorage?: number;

  /**
   * Upper limit to which RDS can scale the storage in GiB(Gibibyte).
   * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.StorageTypes.html#USER_PIOPS.Autoscaling
   * @default - 10
   */
  readonly maxAllocatedStorage?: number;
}

export class PostgresRds extends Construct {
  private readonly instance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: PostgresRdsProps) {
    super(scope, id);

    if (!process.env.DATABASE_NAME || !process.env.POSTGRES_USER) {
      throw new Error('Please set DATABASE_NAME and POSTGRES_USER in the environment variables.');
    }

    // NOTE: In this construct, the database engine is PostgreSQL 16.2.
    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16_2,
    });

    // NOTE: Select the subnets that are isolated and private.
    const vpcSubnets = props.vpc.selectSubnets({
      subnets: props.vpc.isolatedSubnets.concat(props.vpc.privateSubnets),
    });

    this.instance = new rds.DatabaseInstance(this, `${Stack.of(this).stackName}RdsInstance`, {
      ...props,
      vpcSubnets,
      engine,
      instanceType:
        props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      // NOTE: Select the minimum storage size available for GP2.
      // https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/CHAP_Storage.html
      allocatedStorage: props.allocatedStorage ?? 5,
      maxAllocatedStorage: props.maxAllocatedStorage ?? 10,
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
