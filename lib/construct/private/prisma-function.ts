import { IAccessPoint } from 'aws-cdk-lib/aws-efs';
import { FileSystem, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface DatabaseConnectionProps extends NodejsFunctionProps {
  accessPoint: IAccessPoint;
  mountPath: string;
  databaseUrl: string;
}

export class NodejsFunctionWithConnectPrisma extends NodejsFunction {
  constructor(scope: Construct, id: string, props: DatabaseConnectionProps) {
    super(scope, id, {
      ...props,
      filesystem: FileSystem.fromEfsAccessPoint(props.accessPoint, props.mountPath),
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
      runtime: Runtime.NODEJS_20_X,
    });

    this.validateDatabaseUrl(props.databaseUrl);
  }

  private validateDatabaseUrl(arg: string) {
    if (!arg.includes('file:')) throw new Error('The database URL must be a file URL');
    this.addEnvironment('DATABASE_URL', arg);
  }
}
