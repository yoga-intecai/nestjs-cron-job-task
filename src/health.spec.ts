import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest';
import { AppController } from './app.controller.js';

describe('Health endpoints (HTTP)', () => {
  let app: INestApplication;

  const mockConnection = { readyState: 1 };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: getConnectionToken(), useValue: mockConnection }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns 200 and liveness status', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('GET /ready returns 200 when MongoDB is connected', async () => {
    mockConnection.readyState = 1;

    const response = await request(app.getHttpServer()).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ready', database: 'connected' });
  });

  it('GET /ready returns 503 when MongoDB is disconnected', async () => {
    mockConnection.readyState = 0;

    const response = await request(app.getHttpServer()).get('/ready');

    expect(response.status).toBe(503);
  });
});
