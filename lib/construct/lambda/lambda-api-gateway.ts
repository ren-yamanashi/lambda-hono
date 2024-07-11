import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import {
  NodejsFunctionWithConnectPrisma,
  NodejsFunctionWithConnectPrismaProps,
} from './nodejs-function-with-connect-prisma';

export class LambdaApiGateway extends Construct {
  constructor(scope: Construct, id: string, props: NodejsFunctionWithConnectPrismaProps) {
    super(scope, id);

    const lambdaFn = new NodejsFunctionWithConnectPrisma(this, `${id}WithConnectPrisma`, props);

    new apigateway.LambdaRestApi(this, 'LambdaRestAPi', {
      handler: lambdaFn,
    });
  }
}
