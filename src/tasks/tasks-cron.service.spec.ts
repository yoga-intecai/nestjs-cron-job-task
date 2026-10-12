import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Task } from './task.schema.js';
import { TasksCronService, EXPIRE_TASKS_LOCK } from './tasks-cron.service.js';
import { CronLockService } from '../cron-lock.service.js';

describe('TasksCronService', () => {
  let service: TasksCronService;
  let taskModel: { updateMany: ReturnType<typeof vi.fn> };
  let cronLockService: {
    acquireLock: ReturnType<typeof vi.fn>;
    releaseLock: ReturnType<typeof vi.fn>;
    renewLock: ReturnType<typeof vi.fn>;
  };
  let schedulerRegistry: { addCronJob: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    taskModel = { updateMany: vi.fn() };
    cronLockService = {
      acquireLock: vi.fn(),
      releaseLock: vi.fn(),
      renewLock: vi.fn(),
    };
    schedulerRegistry = { addCronJob: vi.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TasksCronService,
        { provide: getModelToken(Task.name), useValue: taskModel },
        { provide: CronLockService, useValue: cronLockService },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
          },
        },
        { provide: SchedulerRegistry, useValue: schedulerRegistry },
      ],
    }).compile();

    service = moduleRef.get<TasksCronService>(TasksCronService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers and stops the cron job on init/destroy', () => {
    service.onModuleInit();

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
      EXPIRE_TASKS_LOCK,
      expect.anything(),
    );

    expect(() => service.onModuleDestroy()).not.toThrow();
  });

  it('expires pending tasks and releases the lock when acquired', async () => {
    cronLockService.acquireLock.mockResolvedValue(true);
    taskModel.updateMany.mockResolvedValue({
      matchedCount: 2,
      modifiedCount: 2,
    });

    await service.handleExpiredTasks();

    expect(cronLockService.acquireLock).toHaveBeenCalledWith(
      EXPIRE_TASKS_LOCK,
      30,
    );
    expect(taskModel.updateMany).toHaveBeenCalledTimes(1);
    expect(cronLockService.releaseLock).toHaveBeenCalledWith(EXPIRE_TASKS_LOCK);
  });

  it('skips execution when the lock is held elsewhere', async () => {
    cronLockService.acquireLock.mockResolvedValue(false);

    await service.handleExpiredTasks();

    expect(taskModel.updateMany).not.toHaveBeenCalled();
    expect(cronLockService.releaseLock).not.toHaveBeenCalled();
  });

  it('still releases the lock when the database update fails', async () => {
    cronLockService.acquireLock.mockResolvedValue(true);
    taskModel.updateMany.mockRejectedValue(new Error('db down'));

    await expect(service.handleExpiredTasks()).resolves.toBeUndefined();

    expect(cronLockService.releaseLock).toHaveBeenCalledWith(EXPIRE_TASKS_LOCK);
  });
});
