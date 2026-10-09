
import {
  Controller,
  Body,
  Get,
  Post,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
  ) {}

  
  @Post()
  createTask(
    @Body()
    body: {
      title: string;
      expiresAt: string;
    },
  ) {
    return this.tasksService.createTask(
      body.title,
      new Date(body.expiresAt),
    );
  }

  
  @Get()
  getAllTasks() {
    return this.tasksService.getAllTasks();
  }

  @Get(':id')
  getTaskById(@Param('id') id: string) {
    return this.tasksService.getTaskById(id);
  }


  @Patch(':id')
updateTask(
  @Param('id') id: string,
  @Body()
  body: {
    title?: string;
    status?: 'Pending' | 'In Progress' | 'Expired';
    expiresAt?: string;
  },
) {
  const updateData: {
    title?: string;
    status?: 'Pending' | 'In Progress' | 'Expired';
    expiresAt?: Date;
  } = {};

  if (body.title !== undefined) {
    updateData.title = body.title;
  }

  if (body.status !== undefined) {
    updateData.status = body.status;
  }

  if (body.expiresAt !== undefined) {
    updateData.expiresAt = new Date(body.expiresAt);
  }

  return this.tasksService.updateTask(id, updateData);
}
  
  
  @Delete(':id')
  deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }
}