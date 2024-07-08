import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface ApiGatewayConstructProps {
  readonly handler: lambda.IFunction;
  readonly resourceName: string;
}

export class ApiGatewayConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    new apigateway.LambdaRestApi(this, 'LambdaRestAPi', {
      handler: props.handler,
      restApiName: `${props.resourceName}-apigw`,
    });
  }
}
