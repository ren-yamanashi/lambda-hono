import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ErrorAlarmConstructProps {
  readonly logGroup: logs.ILogGroup;
  readonly alarmAction: cloudwatch.IAlarmAction;
}

export class ErrorAlarmConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ErrorAlarmConstructProps) {
    super(scope, id);

    const metricName = `${id}ErrorMetric`;
    const metricNamespace = `${cdk.Stack.of(this).stackName}/${metricName}`;

    // ------------------------------
    // log group metric filter
    // ------------------------------
    props.logGroup.addMetricFilter('ErrorMetricFilter', {
      metricNamespace,
      metricName,
      filterPattern: logs.FilterPattern.literal('{ $.level = "ERROR" }'),
    });

    // ------------------------------
    // cloud watch metric
    // ------------------------------
    const metric = new cloudwatch.Metric({
      namespace: metricNamespace,
      metricName,
      period: cdk.Duration.minutes(10),
      statistic: cloudwatch.Stats.SUM,
    });

    // ------------------------------
    // cloud watch alarm
    // ------------------------------
    const cloudWatchAlarm = new cloudwatch.Alarm(this, 'CloudWatchAlarm', {
      metric,
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
    });
    cloudWatchAlarm.addAlarmAction(props.alarmAction);
  }
}
