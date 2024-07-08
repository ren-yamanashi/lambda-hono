import { Logger } from '@aws-lambda-powertools/logger';
import { zValidator } from '@hono/zod-validator';
import { PrismaClient } from '@prisma/client';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

const logger = new Logger({ serviceName: 'hono-prisma' });

const createUserRequestSchema = z.object({
  name: z.string(),
  email: z.string(),
  posts: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      published: z.boolean().optional(),
    }),
  ),
});

const app = new Hono();
const prisma = new PrismaClient();

// Logging middleware
app.use((c, next) => {
  logger.info({
    message: 'Request received',
    path: c.req.path,
    method: c.req.method,
  });
  return next();
});

// Error handling middleware
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    logger.error(
      {
        message: err.message,
      },
      err,
    );
    return c.json(err.message, err.status);
  }
  logger.error(
    {
      message: 'Internal Server Error',
    },
    err,
  );
  return c.text('Internal Server Error', 500);
});

app.get('/', c => c.text('Hello Hono!'));

app.get('/users', async c => {
  try {
    const users = await prisma.user.findMany({
      include: {
        posts: true,
      },
    });
    return c.json(users);
  } catch (error) {
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : `${error}`,
      cause: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
});

app.post(
  '/user',
  zValidator('json', createUserRequestSchema, result => {
    if (!result.success) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }
  }),
  async c => {
    const reqBody = c.req.valid('json');
    try {
      await prisma.user.create({
        data: {
          name: reqBody.name,
          email: reqBody.email,
          posts: {
            create: reqBody.posts.map(post => ({
              title: post.title,
              content: post.content,
              published: post.published,
            })),
          },
        },
      });
      return c.json({ message: 'User created successfully' });
    } catch (error) {
      throw new HTTPException(500, {
        message: error instanceof Error ? error.message : `${error}`,
        cause: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
);

export const handler = handle(app);
