import { Logger } from '@aws-lambda-powertools/logger';
import { Handler } from 'aws-lambda';
import { execFile } from 'child_process';
import * as path from 'path';

/**
 * Lambda経由で `prisma migrate deploy`を実行するために、`node_modules/prisma/build/index.js` を実行する
 * 参考: https://github.com/prisma/prisma/issues/4703
 *      https://github.com/prisma/prisma/issues/4703#issuecomment-669801976
 */
export const handler: Handler = () => {
  const logger = new Logger();
  try {
    execFile(path.resolve('./node_modules/prisma/build/index.js'), ['migrate', 'deploy'], error => {
      if (error) {
        logger.error({
          message: error.message,
          stack: error.stack,
        });
      } else {
        logger.info('Prisma migration completed successfully');
      }
    });
  } catch (error) {
    logger.error({
      message: error instanceof Error ? error.message : `${error}`,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};
