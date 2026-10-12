import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Task } from './task.schema.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('TasksService', () => {
  let service: TasksService;

  const mockTask = {
    _id: new Types.ObjectId().toString(),
    title: 'Test Task',
    status: 'Pending',
    expiresAt: new Date(),
  };

  class MockTaskModel {
    constructor(private data: any) {
      Object.assign(this, data);
    }
    save() {
      return Promise.resolve({ _id: mockTask._id, ...this.data });
    }

    static find = vi.fn();
    static findById = vi.fn();
    static findByIdAndUpdate = vi.fn();
    static findByIdAndDelete = vi.fn();
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getModelToken(Task.name),
          useValue: MockTaskModel,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const title = 'New Task';
      const expiresAt = new Date();
      const result = await service.createTask(title, expiresAt);
      expect(result).toEqual({ _id: mockTask._id, title, expiresAt });
    });

    it('should propagate database errors when saving', async () => {
      const spy = vi
        .spyOn(MockTaskModel.prototype, 'save')
        .mockRejectedValueOnce(new Error('db down'));

      await expect(service.createTask('x', new Date())).rejects.toThrow(
        'db down',
      );

      spy.mockRestore();
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks', async () => {
      const tasks = [mockTask];
      MockTaskModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue(tasks),
      });
      const result = await service.getAllTasks();
      expect(result).toEqual(tasks);
    });
  });

  describe('getTaskById', () => {
    it('should find a task by valid ID', async () => {
      MockTaskModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockTask),
      });
      const result = await service.getTaskById(mockTask._id);
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.getTaskById('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if task missing', async () => {
      const validId = new Types.ObjectId().toString();
      MockTaskModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      await expect(service.getTaskById(validId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate database errors', async () => {
      const validId = new Types.ObjectId().toString();
      MockTaskModel.findById.mockReturnValue({
        exec: vi.fn().mockRejectedValue(new Error('db down')),
      });
      await expect(service.getTaskById(validId)).rejects.toThrow('db down');
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      const updateData = { status: 'In Progress' as const };
      const updatedTask = { ...mockTask, ...updateData };
      MockTaskModel.findByIdAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updatedTask),
      });

      const result = await service.updateTask(mockTask._id, updateData);
      expect(result).toEqual(updatedTask);
      expect(MockTaskModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockTask._id,
        updateData,
        { returnDocument: 'after', runValidators: true },
      );
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.updateTask('invalid-id', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if task missing', async () => {
      const validId = new Types.ObjectId().toString();
      MockTaskModel.findByIdAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      await expect(service.updateTask(validId, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      MockTaskModel.findByIdAndDelete.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockTask),
      });
      const result = await service.deleteTask(mockTask._id);
      expect(result).toEqual({
        message: 'Task deleted successfully',
        task: mockTask,
      });
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.deleteTask('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if task missing', async () => {
      const validId = new Types.ObjectId().toString();
      MockTaskModel.findByIdAndDelete.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      await expect(service.deleteTask(validId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
