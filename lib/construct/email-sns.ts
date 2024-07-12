import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

interface EmailSubscriptionOptions extends Omit<sns.SubscriptionOptions, 'protocol'> {
  /**
   * What type of subscription to add.
   * In this construct, the protocol is EMAIL and does not need to be specified.
   *
   * @default sns.SubscriptionProtocol.EMAIL
   */
  readonly protocol?: sns.SubscriptionProtocol.EMAIL;
}

interface EmailSnsProps extends sns.TopicProps {
  readonly emailSubscriptionOptions: EmailSubscriptionOptions;
}

export class EmailSns extends Construct {
  public readonly topic: sns.ITopic;

  constructor(scope: Construct, id: string, props: EmailSnsProps) {
    super(scope, id);

    this.topic = new sns.Topic(this, `${id}Topic`, {
      ...props,
      displayName: props.displayName,
    });

    new sns.Subscription(this, `${id}Subscription`, {
      ...props.emailSubscriptionOptions,
      topic: this.topic,
      protocol: sns.SubscriptionProtocol.EMAIL,
    });
  }
}
