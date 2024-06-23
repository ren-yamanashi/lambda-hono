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
          resolve(error != null ? 1 : 1);
        },
      );
    });
    if (exitCode) throw Error(`Migration failed with exit code ${exitCode}.`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};
