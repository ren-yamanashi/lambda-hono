import { Duration } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import {
  NodejsFunctionWithConnectPrisma,
  NodejsFunctionWithConnectPrismaProps,
} from './nodejs-function-with-connect-prisma';

interface LambdaApiGatewayProps
  extends NodejsFunctionWithConnectPrismaProps,
    Omit<apigateway.LambdaRestApiProps, 'handler'> {}

export class LambdaApiGateway extends Construct {
  public readonly handler: NodejsFunctionWithConnectPrisma;

  constructor(scope: Construct, id: string, props: LambdaApiGatewayProps) {
    super(scope, id);

    this.handler = new NodejsFunctionWithConnectPrisma(this, `${id}WithConnectPrisma`, {
      ...props,
      // The total timeout for apigateway is 30 seconds, so it must be shorter than that.
      timeout: Duration.seconds(29),
    });

    new apigateway.LambdaRestApi(this, 'LambdaRestAPi', {
      ...props,
      handler: this.handler,
    });
  }
}
