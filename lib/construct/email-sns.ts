import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export class EmailSns extends Construct {
  public readonly topic: sns.ITopic;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    if (!process.env.EMAIL_ADDRESS) {
      throw new Error('EMAIL_ADDRESS is not set');
    }

    this.topic = new sns.Topic(this, 'Topic', {
      displayName: 'EmailTopic',
    });

    new sns.Subscription(this, 'Subscription', {
      topic: this.topic,
      protocol: sns.SubscriptionProtocol.EMAIL,
      endpoint: process.env.EMAIL_ADDRESS,
    });
  }
}
