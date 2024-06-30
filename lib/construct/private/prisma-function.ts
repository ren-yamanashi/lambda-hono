import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface DatabaseConnectionProps {
  host: string;
  port: string;
  engine: string;
  username: string;
  password: string;
  dbname: string;
}

interface NodejsFunctionWithConnectPrismaProps extends lambdaNodejs.NodejsFunctionProps {
  database: DatabaseConnectionProps;
}

export class NodejsFunctionWithConnectPrisma extends lambdaNodejs.NodejsFunction {
  constructor(scope: Construct, id: string, props: NodejsFunctionWithConnectPrismaProps) {
    const { engine, username, password, host, port, dbname } = props.database;
    super(scope, id, {
      ...props,
      environment: {
        ...props.environment,
        DATABASE_URL: `${engine}://${username}:${password}@${host}:${port}/${dbname}`,
      },
      bundling: {
        nodeModules: ['prisma', '@prisma/client'].concat(props.bundling?.nodeModules ?? []),
        commandHooks: {
          // NOTE: prismaディレクトリを出力用ディレクトリにコピーし、Prisma ClientをLambda関数で使用できるようにする
          beforeInstall: (inputDir, outputDir) => [`cp -r ${inputDir}/prisma ${outputDir}`],
          beforeBundling: () => [],
          afterBundling: () => [],
        },
      },
      depsLockFilePath: 'backend/package-lock.json',
      runtime: lambda.Runtime.NODEJS_20_X,
    });
  }
}
