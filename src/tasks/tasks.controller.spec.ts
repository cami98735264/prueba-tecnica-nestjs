import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Task, TaskStatus } from './entities/task.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: TasksService;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'user@example.com',
    role: UserRole.USER,
  };

  const mockAdminUser: Partial<User> = {
    id: '2',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockTask: Partial<Task> = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    dueDate: new Date(),
    userId: mockUser.id,
  };

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        status: TaskStatus.TODO,
      };

      mockTasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(createTaskDto, { user: mockUser });
      expect(result).toEqual(mockTask);
      expect(tasksService.create).toHaveBeenCalledWith(createTaskDto, mockUser);
    });

    it('should throw BadRequestException for invalid task data', async () => {
      const createTaskDto: CreateTaskDto = {
        title: '',
        description: 'Test Description',
        status: TaskStatus.TODO,
      };

      mockTasksService.create.mockRejectedValue(new BadRequestException());

      await expect(
        controller.create(createTaskDto, { user: mockUser }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return tasks with pagination', async () => {
      const mockResponse = {
        tasks: [mockTask],
        total: 1,
      };

      mockTasksService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(
        TaskStatus.TODO,
        undefined,
        1,
        10,
        { user: mockUser },
      );
      expect(result).toEqual(mockResponse);
      expect(tasksService.findAll).toHaveBeenCalledWith(
        mockUser,
        TaskStatus.TODO,
        undefined,
        1,
        10,
      );
    });

    it('should throw BadRequestException for invalid pagination', async () => {
      try {
        await controller.findAll(
          undefined,
          undefined,
          0,  // invalid page number
          10,
          { user: mockUser },
        );
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Page must be a positive number');
      }
    });
  });

  describe('findOne', () => {
    it('should return a task', async () => {
      mockTasksService.findOne.mockResolvedValue(mockTask);

      const result = await controller.findOne('1', { user: mockUser });
      expect(result).toEqual(mockTask);
      expect(tasksService.findOne).toHaveBeenCalledWith('1', mockUser);
    });

    it('should throw NotFoundException for non-existent task', async () => {
      mockTasksService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999', { user: mockUser })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      mockTasksService.findOne.mockRejectedValue(new ForbiddenException());

      await expect(controller.findOne('1', { user: mockUser })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateTaskDto: UpdateTaskDto = {
        status: TaskStatus.DONE,
      };

      mockTasksService.update.mockResolvedValue({
        ...mockTask,
        ...updateTaskDto,
      });

      const result = await controller.update('1', updateTaskDto, {
        user: mockUser,
      });
      expect(result).toEqual({ ...mockTask, ...updateTaskDto });
      expect(tasksService.update).toHaveBeenCalledWith('1', updateTaskDto, mockUser);
    });

    it('should throw BadRequestException for invalid update data', async () => {
      const updateTaskDto: UpdateTaskDto = {
        status: 'INVALID_STATUS' as TaskStatus,
      };

      mockTasksService.update.mockRejectedValue(new BadRequestException());

      await expect(
        controller.update('1', updateTaskDto, { user: mockUser }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      mockTasksService.remove.mockResolvedValue(undefined);

      await expect(
        controller.remove('1', { user: mockUser }),
      ).resolves.not.toThrow();
      expect(tasksService.remove).toHaveBeenCalledWith('1', mockUser);
    });

    it('should throw NotFoundException for non-existent task', async () => {
      mockTasksService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('999', { user: mockUser })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      mockTasksService.remove.mockRejectedValue(new ForbiddenException());

      await expect(controller.remove('1', { user: mockUser })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
}); 