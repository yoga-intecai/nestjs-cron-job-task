import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

describe('TasksController validation (HTTP)', () => {
  let app: INestApplication;

  const mockTasksService = {
    createTask: vi.fn().mockResolvedValue({ _id: '1' }),
    getAllTasks: vi.fn().mockResolvedValue([]),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: mockTasksService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a valid create payload (201)', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({
        title: 'Valid',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      })
      .expect(201);
  });

  it('rejects a missing title (400)', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ expiresAt: new Date().toISOString() })
      .expect(400);
  });

  it('rejects an invalid date (400)', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Bad date', expiresAt: 'not-a-date' })
      .expect(400);
  });

  it('rejects unknown properties (400)', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({
        title: 'Extra',
        expiresAt: new Date().toISOString(),
        unexpected: true,
      })
      .expect(400);
  });

  it('rejects an invalid status on update (400)', async () => {
    await request(app.getHttpServer())
      .patch('/tasks/507f1f77bcf86cd799439011')
      .send({ status: 'Nope' })
      .expect(400);
  });
});
