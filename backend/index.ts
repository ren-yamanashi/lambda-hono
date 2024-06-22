import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { PrismaClient } from '@prisma/client';

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

app.onError((err, c) => {
  console.log(err);
  if (err instanceof HTTPException) {
    return c.json(err.message, err.status);
  }
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
    throw new HTTPException(500, { message: 'Internal Server Error' });
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
      throw new HTTPException(500, { message: 'Internal Server Error' });
    } finally {
      await prisma.$disconnect();
    }
  },
);

export const handler = handle(app);
