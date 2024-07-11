import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import {
  NodejsFunctionWithConnectPrisma,
  NodejsFunctionWithConnectPrismaProps,
} from './nodejs-function-with-connect-prisma';

export class LambdaApiGateway extends Construct {
  public readonly handler: NodejsFunctionWithConnectPrisma;

  constructor(scope: Construct, id: string, props: NodejsFunctionWithConnectPrismaProps) {
    super(scope, id);

    this.handler = new NodejsFunctionWithConnectPrisma(this, `${id}WithConnectPrisma`, props);

    new apigateway.LambdaRestApi(this, 'LambdaRestAPi', {
      handler: this.handler,
    });
  }
}
