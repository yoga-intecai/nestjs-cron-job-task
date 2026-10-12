import type { Model } from 'mongoose';
import { CronLockService } from './cron-lock.service.js';
import type { CronLock } from './cron-lock.schema.js';

interface LockDocument {
  _id: string;
  owner: string;
  lockedAt: Date;
  expiresAt: Date;
}

/**
 * In-memory stand-in for a MongoDB collection that reproduces the atomic
 * semantics this service relies on: a single `findOneAndUpdate` upsert that
 * throws E11000 when the document exists and has not expired.
 */
class FakeCollection {
  readonly docs = new Map<string, LockDocument>();

  async findOneAndUpdate(filter: any, update: any) {
    const id: string = filter._id;
    const now: Date = filter.expiresAt.$lt;
    const existing = this.docs.get(id);

    if (existing) {
      if (existing.expiresAt.getTime() >= now.getTime()) {
        const error: any = new Error('E11000 duplicate key error');
        error.code = 11000;
        throw error;
      }

      const updated: LockDocument = { ...existing, ...update.$set };
      this.docs.set(id, updated);
      return updated;
    }

    const inserted: LockDocument = { _id: id, ...update.$set };
    this.docs.set(id, inserted);
    return inserted;
  }

  async updateOne(filter: any, update: any) {
    const existing = this.docs.get(filter._id);
    if (!existing || existing.owner !== filter.owner) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    Object.assign(existing, update.$set);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(filter: any) {
    const existing = this.docs.get(filter._id);
    if (!existing || existing.owner !== filter.owner) {
      return { deletedCount: 0 };
    }
    this.docs.delete(filter._id);
    return { deletedCount: 1 };
  }
}

function createService(collection: FakeCollection): CronLockService {
  const model = {
    findOneAndUpdate: (filter: any, update: any) => ({
      lean: () => ({
        exec: () => collection.findOneAndUpdate(filter, update),
      }),
    }),
    updateOne: (filter: any, update: any) => ({
      exec: () => collection.updateOne(filter, update),
    }),
    deleteOne: (filter: any) => ({
      exec: () => collection.deleteOne(filter),
    }),
  };

  return new CronLockService(model as unknown as Model<CronLock>);
}

describe('CronLockService', () => {
  let collection: FakeCollection;
  let first: CronLockService;
  let second: CronLockService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    collection = new FakeCollection();
    first = createService(collection);
    second = createService(collection);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('acquires a free lock', async () => {
    await expect(first.acquireLock('job', 30)).resolves.toBe(true);
  });

  it('prevents a second instance from acquiring a held lock', async () => {
    await first.acquireLock('job', 30);

    await expect(second.acquireLock('job', 30)).resolves.toBe(false);
  });

  it('allows takeover once the lease expires', async () => {
    await first.acquireLock('job', 30);
    await expect(second.acquireLock('job', 30)).resolves.toBe(false);

    vi.advanceTimersByTime(31_000);

    await expect(second.acquireLock('job', 30)).resolves.toBe(true);
  });

  it('recovers after a crashed owner stops renewing the lease', async () => {
    await first.acquireLock('job', 30);
    // The owner "crashes" and never releases or renews.
    vi.advanceTimersByTime(30_001);

    await expect(second.acquireLock('job', 30)).resolves.toBe(true);
  });

  it('does not let a former owner release a newer owner lock', async () => {
    await first.acquireLock('job', 30);

    vi.advanceTimersByTime(31_000);
    await second.acquireLock('job', 30);

    await first.releaseLock('job');

    expect(collection.docs.has('job')).toBe(true);
    await expect(second.acquireLock('job', 30)).resolves.toBe(false);
  });

  it('releases the lock and allows re-acquisition', async () => {
    await first.acquireLock('job', 30);
    await first.releaseLock('job');

    await expect(second.acquireLock('job', 30)).resolves.toBe(true);
  });

  it('renews only while still the owner', async () => {
    await first.acquireLock('job', 30);

    await expect(first.renewLock('job', 60)).resolves.toBe(true);
    await expect(second.renewLock('job', 60)).resolves.toBe(false);
  });

  it('fails closed on an unexpected database error', async () => {
    const model = {
      findOneAndUpdate: () => ({
        lean: () => ({
          exec: () => Promise.reject(new Error('connection lost')),
        }),
      }),
    };
    const service = new CronLockService(model as unknown as Model<CronLock>);

    await expect(service.acquireLock('job', 30)).resolves.toBe(false);
  });
});
