import { Stack, StackProps } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { EmailSns } from './construct/email-sns';
import { ErrorAlarm } from './construct/error-alarm';
import * as lambda from './construct/lambda';
import { PostgresRds } from './construct/postgres-rds';

export class LambdaRdsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ------------------------------
    // vpc
    // ------------------------------
    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('192.168.0.0/24'),
      // NOTE: Creates private subnets only. ISOLATED, so no NAT gateway is created.
      subnetConfiguration: [
        {
          cidrMask: 26,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      maxAzs: 2,
    });

    // ------------------------------
    // security group
    // ------------------------------
    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Allow all inbound and outbound traffic.',
      allowAllOutbound: true,
    });

    // ------------------------------
    // rds
    // ------------------------------
    if (!process.env.DATABASE_NAME || !process.env.POSTGRES_USER) {
      throw new Error('Please set DATABASE_NAME and POSTGRES_USER in the environment variables.');
    }
    const credentials = rds.Credentials.fromGeneratedSecret(process.env.POSTGRES_USER, {
      secretName: `${Stack.of(this).stackName}/credentials/`,
    });

    const postgresRds = new PostgresRds(this, 'PostgresRds', {
      vpc,
      credentials,
      databaseName: process.env.DATABASE_NAME,
      availabilityZone: 'ap-northeast-1a',
      storageEncrypted: true,
    });

    const databaseUrl = postgresRds.getDatabaseUrl();

    postgresRds.allowInboundAccess(securityGroup);

    // ------------------------------
    // lambda
    // ------------------------------
    const lambdaApiGateway = new lambda.LambdaApiGateway(this, 'HonoLambdaFunction', {
      vpc,
      securityGroups: [securityGroup],
      environment: {
        DATABASE_URL: databaseUrl,
      },
      depsLockFilePath: 'backend/package-lock.json',
      entry: 'backend/index.ts',
    });

    new lambda.NodejsFunctionWithConnectPrisma(this, 'MigrateLambdaFunction', {
      vpc,
      securityGroups: [securityGroup],
      environment: {
        DATABASE_URL: databaseUrl,
      },
      depsLockFilePath: 'backend/package-lock.json',
      entry: 'backend/migrate.ts',
    });

    // ------------------------------
    // sns
    // ------------------------------
    if (!process.env.EMAIL_ADDRESS) {
      throw new Error('EMAIL_ADDRESS is not set');
    }
    const emailSns = new EmailSns(this, 'EmailSns', {
      displayName: 'EmailTopic',
      emailSubscriptionOptions: {
        endpoint: process.env.EMAIL_ADDRESS,
      },
    });

    // NOTE: Allow publishing to SNS from CloudWatch.
    const snsPublishPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudwatch.amazonaws.com')],
      actions: ['sns:Publish'],
      resources: [emailSns.topic.topicArn],
    });

    emailSns.topic.addToResourcePolicy(snsPublishPolicy);

    // ------------------------------
    // cloud watch
    // ------------------------------
    new ErrorAlarm(this, 'ErrorAlarm', {
      namespace: 'LambdaApiGatewayErrorMetric',
      metricName: 'ErrorLogCount',
      statistic: cloudwatch.Stats.SUM,
      logGroup: lambdaApiGateway.handler.logGroup,
      alarmAction: new actions.SnsAction(emailSns.topic),
      metricFilterOptions: {
        filterPattern: logs.FilterPattern.literal('{ $.level = "ERROR" }'),
      },
      createAlarmOptions: {
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
      },
    });
  }
}
