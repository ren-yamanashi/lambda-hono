import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface NodejsFunctionWithConnectPrismaProps extends lambdaNodejs.NodejsFunctionProps {
  readonly bundling?: never; // Specify "never" so that it is not specified.

  /**
   * Path to the file that locks Prisma dependencies.
   * @requires
   */
  readonly depsLockFilePath: string; // By default it is optional, so change it to required.

  /**
   * The runtime environment. Only runtimes of the Node.js family are
   * supported.
   *
   * @default `Runtime.NODEJS_20_X` if the `@aws-cdk/aws-lambda-nodejs:useLatestRuntimeVersion` feature flag is enabled, otherwise `Runtime.NODEJS_16_X`
   */
  readonly runtime?: lambda.Runtime;

  /**
   * The function execution time (in seconds) after which Lambda terminates
   * the function. Because the execution time affects cost, set this value
   * based on the function's expected execution time.
   *
   * @default Duration.seconds(120)
   */
  readonly timeout?: Duration;
}

export class NodejsFunctionWithConnectPrisma extends lambdaNodejs.NodejsFunction {
  constructor(scope: Construct, id: string, props: NodejsFunctionWithConnectPrismaProps) {
    super(scope, id, {
      ...props,
      bundling: {
        nodeModules: ['prisma', '@prisma/client'],
        commandHooks: {
          // NOTE: Copy the prisma directory to the output directory and make the Prisma Client available to your Lambda function.
          beforeInstall: (inputDir, outputDir) => [`cp -r ${inputDir}/prisma ${outputDir}`],
          beforeBundling: () => [],
          afterBundling: () => [],
        },
      },
      depsLockFilePath: props.depsLockFilePath,
      timeout: props.timeout ?? Duration.seconds(120),
      runtime: props.runtime ?? lambda.Runtime.NODEJS_20_X,
    });
  }
}
