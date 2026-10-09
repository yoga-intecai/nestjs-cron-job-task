import { Injectable , NotFoundException, BadRequestException} from '@nestjs/common';
import { InjectModel} from '@nestjs/mongoose';
import{ Model, isValidObjectId} from 'mongoose';
import { Task, TaskDocument} from './task.schema.js';

@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name)
        private readonly taskModel: Model<TaskDocument>,
    ){}

    async createTask(title: string, expiresAt: Date){
        const task = new this.taskModel({
            title,
            expiresAt,
        });
        return task.save();
    }

    async getAllTasks(){
        return this.taskModel.find().exec();
    }

    async getTaskById(id: string){
        if(!isValidObjectId(id)){
            throw new BadRequestException('Invalid task ID');
        }
        const task = await this.taskModel.findById(id).exec();
        if(!task){
            throw new NotFoundException('Task not found');
        }
        return task;
    }
    async updateTask(
        id:string,
        data: {
        title?: string,
        status?: 'Pending' | 'In Progress' | 'Expired',
        expiresAt?: Date,
 } ){
    if(!isValidObjectId(id)){
        throw new BadRequestException('Invalid task ID');
    }
    const task = await this.taskModel.findByIdAndUpdate(id, data,{
        new: true,
        runValidators: true,
    })
    .exec();

    if (!task){
        throw new NotFoundException('Task not found');
    }
    return task;
 }

 async deleteTask(id: string){
    if(!isValidObjectId(id)){
        throw new BadRequestException('Invalid task ID');
    }
    const task= await this.taskModel.findByIdAndDelete(id).exec();
    if(!task){
        throw new NotFoundException('Task not found');
    }
    return {
        message: 'Task deleted successfully',
        task,
    };
 }
}

