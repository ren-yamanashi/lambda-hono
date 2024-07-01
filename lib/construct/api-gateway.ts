import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

interface ApiGatewayConstructProps {
  handler: lambdaNodejs.NodejsFunction;
  resourceName: string;
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
