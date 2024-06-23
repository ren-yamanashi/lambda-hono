import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  AccessPoint,
  FileSystem,
  LifecyclePolicy,
  OutOfInfrequentAccessPolicy,
} from 'aws-cdk-lib/aws-efs';
import { Construct } from 'constructs';

interface EfsConstructProps {
  vpc: Vpc;
  securityGroup: SecurityGroup;
  resourceName: string;
}

export class EfsConstruct extends Construct {
  public readonly fileSystem: FileSystem;
  public readonly accessPoint: AccessPoint;

  constructor(scope: Construct, id: string, props: EfsConstructProps) {
    super(scope, id);

    this.fileSystem = new FileSystem(this, 'FileSystem', {
      vpc: props.vpc,
      fileSystemName: `${props.resourceName}-efs`,
      // NOTE: 14日後に低頻度アクセスストレージ(IAストレージ)に移行
      lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS,
      // NOTE: 1回のアクセス後にプライマリストレージに移行
      outOfInfrequentAccessPolicy: OutOfInfrequentAccessPolicy.AFTER_1_ACCESS,
      securityGroup: props.securityGroup,
    });

    this.accessPoint = this.fileSystem.addAccessPoint('AccessPoint', {
      // NOTE: アクセスポイントのルートを設定
      path: '/export/lambda',
      // NOTE: `/export/lambda` が新しい EFSに存在しない場合、EFSは以下のcreateAclを使用してディレクトリを作成する
      createAcl: {
        ownerGid: '1001',
        ownerUid: '1001',
        permissions: '750',
      },
      // NOTE: POSIX IDを強制してLambda関数がこのIDでアクセスするようにする
      posixUser: {
        gid: '1001',
        uid: '1001',
      },
    });
  }
}
