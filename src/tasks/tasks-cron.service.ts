// import {Injectable, Logger} from '@nestjs/common';
// import {Cron} from '@nestjs/schedule';
// import {InjectModel} from '@nestjs/mongoose';
// import {Model} from 'mongoose';
// import {Task, TaskDocument} from './task.schema.js';

// @Injectable()
// export class TasksCronService {
//     private readonly logger = new Logger(TasksCronService.name);

//     constructor(
//         @InjectModel(Task.name)
//         private readonly taskModel: Model<TaskDocument>,

//     ){}

//     @Cron('*/10 * * * * *')
//     async handleCron(){
//         const now = new Date();
//         const result = await this.taskModel.updateMany(
//             {
//                 status: 'PENDING',
//                 expiresAt: {$lt:new Date()},
//         },
//         {
//             $set:{
//                 status:'EXPIRED',
//             },
//         },
//         );
//          if(result.modifiedCount >0){
//         this.logger.log(
//             `${result.modifiedCount} tasks marked as Expired`,
//         );
//     }
//     }
   
    
// }

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Task, TaskDocument } from './task.schema.js';

@Injectable()
export class TasksCronService {
  private readonly logger = new Logger(TasksCronService.name);

  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  @Cron('*/10 * * * * *')
  async handleExpiredTasks() {
    this.logger.log('Checking for expired tasks...');

    const result = await this.taskModel.updateMany(
      {
        status: 'Pending',
        expiresAt: { $lt: new Date() },
      },
      {
        $set: {
          status: 'Expired',
        },
      },
    );

    this.logger.log(
      `Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`,
    );
  }
}