import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: Repository<Task>;

  const mockUser: User = {
    id: '1',
    email: 'user@example.com',
    password: 'hashedPassword',
    role: UserRole.USER,
    tasks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAdminUser: User = {
    id: '2',
    email: 'admin@example.com',
    password: 'hashedPassword',
    role: UserRole.ADMIN,
    tasks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    dueDate: new Date(),
    user: mockUser,
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTask], 1]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        status: TaskStatus.TODO,
      };

      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      const result = await service.create(createTaskDto, mockUser);
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException when title is missing', async () => {
      const createTaskDto = {
        description: 'Test Description',
        status: TaskStatus.TODO,
      };

      await expect(service.create(createTaskDto as any, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is invalid', async () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'INVALID_STATUS',
      };

      await expect(service.create(createTaskDto as any, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when dueDate is invalid', async () => {
      const createTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        status: TaskStatus.TODO,
        dueDate: 'invalid-date',
      };

      await expect(service.create(createTaskDto as any, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return tasks with pagination for user', async () => {
      const result = await service.findAll(mockUser, undefined, undefined, 1, 10);
      expect(result).toEqual({ tasks: [mockTask], total: 1 });
    });

    it('should return tasks with pagination for admin', async () => {
      const result = await service.findAll(mockAdminUser, undefined, undefined, 1, 10);
      expect(result).toEqual({ tasks: [mockTask], total: 1 });
    });

    it('should filter tasks by status', async () => {
      const mockTaskInProgress = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      mockTaskRepository.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTaskInProgress], 1]),
      }));

      const result = await service.findAll(mockUser, TaskStatus.IN_PROGRESS, undefined, 1, 10);
      expect(result).toEqual({ tasks: [mockTaskInProgress], total: 1 });
    });

    it('should filter tasks by due date', async () => {
      const dueDate = new Date('2024-04-15');
      const mockTaskWithDueDate = { ...mockTask, dueDate };
      mockTaskRepository.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTaskWithDueDate], 1]),
      }));

      const result = await service.findAll(mockUser, undefined, dueDate, 1, 10);
      expect(result).toEqual({ tasks: [mockTaskWithDueDate], total: 1 });
    });

    it('should filter tasks by both status and due date', async () => {
      const dueDate = new Date('2024-04-15');
      const mockTaskFiltered = { ...mockTask, status: TaskStatus.DONE, dueDate };
      mockTaskRepository.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTaskFiltered], 1]),
      }));

      const result = await service.findAll(mockUser, TaskStatus.DONE, dueDate, 1, 10);
      expect(result).toEqual({ tasks: [mockTaskFiltered], total: 1 });
    });

    it('should handle pagination with default values', async () => {
      mockTaskRepository.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTask], 1]),
      }));

      const result = await service.findAll(mockUser, undefined, undefined, undefined, undefined);
      expect(result).toEqual({ tasks: [mockTask], total: 1 });
    });

    it('should handle large page numbers', async () => {
      mockTaskRepository.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }));

      const result = await service.findAll(mockUser, undefined, undefined, 999999, 10);
      expect(result).toEqual({ tasks: [], total: 0 });
    });

    it('should handle large limit values', async () => {
      const mockTasks = Array(100).fill(mockTask);
      mockTaskRepository.createQueryBuilder.mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockTasks, 100]),
      }));

      const result = await service.findAll(mockUser, undefined, undefined, 1, 100);
      expect(result).toEqual({ tasks: mockTasks, total: 100 });
    });
  });

  describe('findOne', () => {
    it('should return a task', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      const result = await service.findOne('1', mockUser);
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner or admin', async () => {
      const otherUser = { ...mockUser, id: '2', role: UserRole.USER };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await expect(service.findOne('1', otherUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateTaskDto = {
        status: TaskStatus.DONE,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, ...updateTaskDto });

      const result = await service.update('1', updateTaskDto, mockUser);
      expect(result).toEqual({ ...mockTask, ...updateTaskDto });
    });

    it('should throw ForbiddenException if user is not owner or admin', async () => {
      const otherUser = { ...mockUser, id: '2', role: UserRole.USER };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await expect(
        service.update('1', { status: TaskStatus.DONE }, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when updating with invalid status', async () => {
      const updateTaskDto = {
        status: 'INVALID_STATUS',
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      await expect(service.update('1', updateTaskDto as any, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating with invalid dueDate', async () => {
      const updateTaskDto = {
        dueDate: 'invalid-date',
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      await expect(service.update('1', updateTaskDto as any, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.remove.mockResolvedValue(mockTask);

      await expect(service.remove('1', mockUser)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if user is not owner or admin', async () => {
      const otherUser = { ...mockUser, id: '2', role: UserRole.USER };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await expect(service.remove('1', otherUser)).rejects.toThrow(ForbiddenException);
    });
  });
}); 