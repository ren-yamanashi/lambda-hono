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
      // NOTE: transitioned to IA storage after 14 days
      lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS,
      // NOTE: transitioned to primary storage after 1 access
      outOfInfrequentAccessPolicy: OutOfInfrequentAccessPolicy.AFTER_1_ACCESS,
      securityGroup: props.securityGroup,
    });

    this.accessPoint = this.fileSystem.addAccessPoint('AccessPoint', {
      // NOTE: set access point root
      path: '/export/lambda',
      // NOTE: `/export/lambda` does not exist in a new efs filesystem, the efs will create the directory with the following createAcl
      createAcl: {
        ownerGid: '1001',
        ownerUid: '1001',
        permissions: '750',
      },
      // NOTE: enforce the POSIX identity so lambda function will access with this identity
      posixUser: {
        gid: '1001',
        uid: '1001',
      },
    });
  }
}
