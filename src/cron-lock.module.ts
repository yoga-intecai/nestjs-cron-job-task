import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CronLock, CronLockSchema } from './cron-lock.schema.js';
import { CronLockService } from './cron-lock.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CronLock.name, schema: CronLockSchema },
    ]),
  ],
  providers: [CronLockService],
  exports: [CronLockService],
})
export class CronLockModule {}
