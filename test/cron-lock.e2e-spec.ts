import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from './../src/app.module.js';
import { CronLockService } from './../src/cron-lock.service.js';

describe('CronLockService (e2e, real MongoDB)', () => {
  let app: INestApplication;
  let lockService: CronLockService;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    lockService = app.get(CronLockService);
    connection = app.get(getConnectionToken());
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces mutual exclusion while a lock is held', async () => {
    const lockName = `e2e_lock_${Date.now()}`;

    await expect(lockService.acquireLock(lockName, 30)).resolves.toBe(true);
    await expect(lockService.acquireLock(lockName, 30)).resolves.toBe(false);

    await lockService.releaseLock(lockName);

    await expect(lockService.acquireLock(lockName, 30)).resolves.toBe(true);
    await lockService.releaseLock(lockName);
  });

  it('allows takeover once a lease expires', async () => {
    const lockName = `e2e_lock_${Date.now()}`;

    await lockService.acquireLock(lockName, 1);

    await new Promise((resolve) => setTimeout(resolve, 1_100));

    await expect(lockService.acquireLock(lockName, 30)).resolves.toBe(true);
    await lockService.releaseLock(lockName);
  });

  it('does not release a lock no longer owned by this instance', async () => {
    const lockName = `e2e_lock_${Date.now()}`;

    await lockService.acquireLock(lockName, 30);

    await connection.db
      .collection('cron_locks')
      .updateOne({ _id: lockName }, { $set: { owner: 'someone-else' } });

    await lockService.releaseLock(lockName);

    const remaining = await connection.db
      .collection('cron_locks')
      .findOne({ _id: lockName });
    expect(remaining).not.toBeNull();
    expect(remaining?.owner).toBe('someone-else');

    await connection.db.collection('cron_locks').deleteMany({ _id: lockName });
  });
});
