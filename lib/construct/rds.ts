import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

import { Construct } from 'constructs';

interface RdsConstructProps {
  vpc: ec2.IVpc;
  resourceName: string;
}

export class RdsConstruct extends Construct {
  readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: RdsConstructProps) {
    super(scope, id);

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_16_2,
    });
    const credentials = rds.Credentials.fromGeneratedSecret('cdk_test_user', {
      secretName: `/${props.resourceName}/rds/`,
    });

    const cluster = new rds.DatabaseCluster(this, 'RdsCluster', {
      engine,
      defaultDatabaseName: 'cdk_test_db',
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        enablePerformanceInsights: true,
        caCertificate: rds.CaCertificate.RDS_CA_ECC384_G1,
      }),
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({
        subnets: props.vpc.isolatedSubnets.concat(props.vpc.privateSubnets),
      }),
      storageEncrypted: true,
      credentials,
    });

    this.cluster = cluster;
  }

  allowInboundAccess(peer: ec2.IPeer) {
    this.cluster.connections.allowDefaultPortFrom(peer);
  }
}
