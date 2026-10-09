import { Module } from '@nestjs/common';
import {ScheduleModule} from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CronService } from './cron.service.js';
import { TasksModule } from './tasks/tasks.module.js';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(
      'mongodb://localhost:27017/cron-job_practice',
    ),
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService, CronService],
})

export class AppModule {}
