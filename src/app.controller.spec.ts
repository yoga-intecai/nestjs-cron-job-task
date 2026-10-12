import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { getConnectionToken } from '@nestjs/mongoose';

describe('AppController', () => {
  let appController: AppController;
  const mockConnection = { readyState: 1 };

  beforeEach(async () => {
    mockConnection.readyState = 1;

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return ok with a timestamp', () => {
      const res = appController.getHealth();
      expect(res.status).toBe('ok');
      expect(res.timestamp).toBeDefined();
    });
  });

  describe('ready', () => {
    it('should return ready when the database is connected', () => {
      expect(appController.getReady()).toEqual({
        status: 'ready',
        database: 'connected',
      });
    });

    it('should throw ServiceUnavailableException when the database is disconnected', () => {
      mockConnection.readyState = 0;

      expect(() => appController.getReady()).toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
