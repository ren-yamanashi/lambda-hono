import { Handler } from 'aws-lambda';
import { execFile } from 'child_process';
import * as path from 'path';

/**
 * Lambda経由で `prisma migrate deploy`を実行するために、`node_modules/prisma/build/index.js` を実行する
 * 参考: https://github.com/prisma/prisma/issues/4703
 *      https://github.com/prisma/prisma/issues/4703#issuecomment-669801976
 */
export const handler: Handler = async () => {
  try {
    const exitCode = await new Promise(resolve => {
      execFile(
        path.resolve('./node_modules/prisma/build/index.js'),
        ['migrate', 'deploy'],
        (error, stdout) => {
          console.log(stdout);
          if (error != null) {
            console.log(`prisma migrate deploy exited with error ${error.message}`);
            resolve(error.code ?? 1);
          } else {
            resolve(0);
          }
        },
      );
    });

    if (exitCode != 0) throw Error(`command deploy failed with exit code ${exitCode}`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};
