import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './task.schema.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { TasksCronService } from './tasks-cron.service.js';
import { CronLockModule } from '../cron-lock.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    CronLockModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksCronService],
})
export class TasksModule {}
