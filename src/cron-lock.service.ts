import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { CronLock } from './cron-lock.schema.js';

@Injectable()
export class CronLockService {
  private readonly logger = new Logger(CronLockService.name);
  private readonly instanceId = randomUUID();

  constructor(
    @InjectModel(CronLock.name)
    private readonly lockModel: Model<CronLock>,
  ) {}

  /**
   * Atomically acquire a distributed lock.
   *
   * The lock document uses the lock name as its `_id`, which makes acquisition
   * a single atomic `findOneAndUpdate` upsert. When the document already exists
   * and has not expired, the upsert fails with a duplicate key error (E11000)
   * and the lock is reported as held by another instance.
   */
  async acquireLock(lockName: string, ttlSeconds: number): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
      const document = await this.lockModel
        .findOneAndUpdate(
          { _id: lockName, expiresAt: { $lt: now } },
          { $set: { owner: this.instanceId, lockedAt: now, expiresAt } },
          { upsert: true, returnDocument: 'after' },
        )
        .lean()
        .exec();

      if (document && document.owner === this.instanceId) {
        this.logger.debug(`Acquired lock "${lockName}" for ${ttlSeconds}s.`);
        return true;
      }

      return false;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        this.logger.debug(`Lock "${lockName}" is held by another instance.`);
        return false;
      }

      this.logger.error(
        `Failed to acquire lock "${lockName}": ${errorMessage(error)}`,
      );
      return false;
    }
  }

  /**
   * Extend the lease of a lock owned by this instance. Returns false when the
   * lock is no longer owned by this instance (e.g. it expired and was taken
   * over), so the caller can stop work safely.
   */
  async renewLock(lockName: string, ttlSeconds: number): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    try {
      const result = await this.lockModel
        .updateOne(
          { _id: lockName, owner: this.instanceId },
          { $set: { expiresAt } },
        )
        .exec();

      return result.matchedCount > 0;
    } catch (error) {
      this.logger.error(
        `Failed to renew lock "${lockName}": ${errorMessage(error)}`,
      );
      return false;
    }
  }

  /**
   * Release a lock only if this instance is still the owner. This guarantees a
   * former owner whose lease expired can never release a newer owner's lock.
   */
  async releaseLock(lockName: string): Promise<void> {
    try {
      const result = await this.lockModel
        .deleteOne({ _id: lockName, owner: this.instanceId })
        .exec();

      if (result.deletedCount > 0) {
        this.logger.debug(`Released lock "${lockName}".`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to release lock "${lockName}": ${errorMessage(error)}`,
      );
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  const candidate = error as { code?: number; codeName?: string } | null;
  return candidate?.code === 11000 || candidate?.codeName === 'DuplicateKey';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
