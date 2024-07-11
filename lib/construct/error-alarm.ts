import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

interface ErrorAlarmConstructProps {
  readonly logGroup: logs.ILogGroup;
}

export class ErrorAlarmConstruct extends Construct {
  private readonly topic: sns.ITopic;
  public readonly topicArn: string;

  constructor(scope: Construct, id: string, props: ErrorAlarmConstructProps) {
    super(scope, id);

    const metricNamespace = `${id}/Lambda`;
    const metricName = 'LambdaError';

    this.topic = new sns.Topic(this, 'ErrorAlarmTopic', {
      displayName: 'Lambda Error Alarm Topic',
    });
    this.topicArn = this.topic.topicArn;

    if (!process.env.EMAIL_ADDRESS) {
      throw new Error('EMAIL_ADDRESS is not set');
    }
    new sns.Subscription(this, 'MonitorAlarmEmail', {
      endpoint: process.env.EMAIL_ADDRESS,
      protocol: sns.SubscriptionProtocol.EMAIL,
      topic: this.topic,
    });

    props.logGroup.addMetricFilter('ErrorMetricFilter', {
      metricNamespace,
      metricName,
      filterPattern: logs.FilterPattern.literal('{ $.level = "ERROR" }'),
    });

    const metric = new cloudwatch.Metric({
      namespace: metricNamespace,
      metricName,
      period: cdk.Duration.minutes(1),
      statistic: cloudwatch.Stats.SUM,
    });

    const alarm = new cloudwatch.Alarm(this, 'CDKErrorAlarm', {
      metric,
      // NOTE: 直近3回の評価で2回以上エラーが発生した場合にアラームを発生させる
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
    });
    alarm.addAlarmAction(new actions.SnsAction(this.topic));
  }

  public addResourcePolicy(policyStatement: iam.PolicyStatement) {
    this.topic.addToResourcePolicy(policyStatement);
  }
}
