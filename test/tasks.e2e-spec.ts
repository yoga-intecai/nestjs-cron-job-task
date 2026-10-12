import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let taskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs the full CRUD lifecycle', async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const created = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'e2e task', expiresAt })
      .expect(201);

    expect(created.body.status).toBe('Pending');
    taskId = created.body._id;

    const list = await request(app.getHttpServer()).get('/tasks').expect(200);
    expect(Array.isArray(list.body)).toBe(true);

    const fetched = await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .expect(200);
    expect(fetched.body.title).toBe('e2e task');

    const updated = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .send({ status: 'In Progress' })
      .expect(200);
    expect(updated.body.status).toBe('In Progress');

    await request(app.getHttpServer()).delete(`/tasks/${taskId}`).expect(200);
    await request(app.getHttpServer()).get(`/tasks/${taskId}`).expect(404);
  });

  it('rejects an invalid task id with 400', async () => {
    await request(app.getHttpServer()).get('/tasks/not-an-id').expect(400);
  });

  it('rejects an invalid payload with 400', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ expiresAt: new Date().toISOString() })
      .expect(400);
  });
});
