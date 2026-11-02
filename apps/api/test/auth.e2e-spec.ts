import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

describe('Auth & Worlds (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const testEmail = `e2e_${Date.now()}@example.com`;
  let accessToken: string;
  let refreshToken: string;

  it('/auth/register (POST) -> should register user successfully', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
        name: 'E2E Tester',
      })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('/auth/refresh (POST) -> should rotate refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.refreshToken).not.toBe(refreshToken);
    accessToken = res.body.accessToken;
  });

  it('/worlds (POST) -> should create a world with authenticated user as OWNER', async () => {
    const res = await request(app.getHttpServer())
      .post('/worlds')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'E2E Test World',
        slug: `world-${Date.now()}`,
        description: 'World created during e2e suite',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('E2E Test World');
  });

  it('/worlds (POST) -> should reject unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .post('/worlds')
      .send({ name: 'Unauthorized World', slug: 'unauthorized' })
      .expect(401);
  });
});
