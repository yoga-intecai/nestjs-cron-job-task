import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CronJob } from 'cron';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Task, TaskDocument } from './task.schema.js';
import { CronLockService } from '../cron-lock.service.js';

export const EXPIRE_TASKS_LOCK = 'expire_tasks_cron';

@Injectable()
export class TasksCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TasksCronService.name);
  private job?: CronJob;

  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    private readonly cronLockService: CronLockService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const schedule = this.configService.get<string>(
      'CRON_SCHEDULE',
      '0 * * * * *',
    );
    const timeZone = this.configService.get<string>('CRON_TIMEZONE', 'UTC');

    this.job = new CronJob(
      schedule,
      () => {
        void this.handleExpiredTasks();
      },
      null,
      false,
      timeZone,
    );

    this.schedulerRegistry.addCronJob(EXPIRE_TASKS_LOCK, this.job);
    this.job.start();

    this.logger.log(
      `Scheduled "${EXPIRE_TASKS_LOCK}" cron (schedule: ${schedule}, timezone: ${timeZone}).`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.job?.stop();
  }

  async handleExpiredTasks(): Promise<void> {
    const ttlSeconds = this.configService.get<number>(
      'CRON_LOCK_TTL_SECONDS',
      30,
    );

    const acquired = await this.cronLockService.acquireLock(
      EXPIRE_TASKS_LOCK,
      ttlSeconds,
    );

    if (!acquired) {
      this.logger.debug(
        'Task expiry cron skipped: lock is held by another instance.',
      );
      return;
    }

    try {
      const result = await this.taskModel.updateMany(
        { status: 'Pending', expiresAt: { $lt: new Date() } },
        { $set: { status: 'Expired' } },
      );

      this.logger.log(
        `Task expiry cron finished (matched: ${result.matchedCount}, modified: ${result.modifiedCount}).`,
      );
    } catch (error) {
      this.logger.error(
        `Task expiry cron failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      await this.cronLockService.releaseLock(EXPIRE_TASKS_LOCK);
    }
  }
}
