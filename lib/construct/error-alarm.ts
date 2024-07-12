import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ErrorAlarmConstructProps extends cloudwatch.MetricProps {
  readonly logGroup: logs.ILogGroup;
  readonly metricFilterOptions: Omit<logs.MetricFilterOptions, 'metricNamespace' | 'metricName'>;
  readonly alarmAction: cloudwatch.IAlarmAction;
  readonly createAlarmOptions: cloudwatch.CreateAlarmOptions;
}

export class ErrorAlarmConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ErrorAlarmConstructProps) {
    super(scope, id);

    props.logGroup.addMetricFilter('LambdaApiGatewayMetricFilter', {
      ...props.metricFilterOptions,
      metricNamespace: props.namespace,
      metricName: props.metricName,
    });

    const metric = new cloudwatch.Metric({
      ...props,
    });

    const cloudWatchAlarm = new cloudwatch.Alarm(this, 'CloudWatchAlarm', {
      ...props.createAlarmOptions,
      metric,
    });

    cloudWatchAlarm.addAlarmAction(props.alarmAction);
  }
}
