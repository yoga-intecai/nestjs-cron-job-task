import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type CronLockDocument = HydratedDocument<CronLock>;

@Schema({ collection: 'cron_locks', versionKey: false })
export class CronLock {
  @Prop({ type: String })
  _id: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true })
  lockedAt: Date;

  @Prop({ required: true })
  expiresAt: Date;
}

export const CronLockSchema = SchemaFactory.createForClass(CronLock);

// `_id` is unique by definition, so the lock name doubles as the unique key.
// A TTL index reclaims locks left behind by crashed instances once the lease
// expires (MongoDB's TTL monitor runs roughly every 60 seconds, so the
// time-based filter in `acquireLock` remains the primary expiry mechanism).
CronLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
