import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

interface ApiGatewayConstructProps {
  handler: NodejsFunction;
  resourceName: string;
}

export class ApiGatewayConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    new LambdaRestApi(this, 'LambdaApiGateway', {
      handler: props.handler,
      restApiName: `${props.resourceName}-api`,
    });
  }
}
