import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Task, TaskStatus } from '../src/tasks/entities/task.entity';
import { AuthService } from '../src/auth/auth.service';
import { TasksService } from '../src/tasks/tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from '../src/config/database.config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

describe('Database Integration Tests', () => {
  let userRepository: Repository<User>;
  let taskRepository: Repository<Task>;
  let authService: AuthService;
  let tasksService: TasksService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          ...databaseConfig as PostgresConnectionOptions,
          database: 'task_management_test',
        }),
        TypeOrmModule.forFeature([User, Task]),
      ],
      providers: [AuthService, TasksService],
    }).compile();

    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    authService = module.get<AuthService>(AuthService);
    tasksService = module.get<TasksService>(TasksService);
  });

  beforeEach(async () => {
    await taskRepository.delete({});
    await userRepository.delete({});
  });

  describe('User Operations', () => {
    it('should create and retrieve a user', async () => {
      const user = await authService.register('test@example.com', 'password123');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe(UserRole.USER);

      const foundUser = await userRepository.findOne({ where: { email: user.email } });
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(user.email);
    });

    it('should not allow duplicate emails', async () => {
      await authService.register('test@example.com', 'password123');
      await expect(
        authService.register('test@example.com', 'password123'),
      ).rejects.toThrow();
    });

    it('should create admin user for admin@example.com', async () => {
      const admin = await authService.register('admin@example.com', 'password123');
      expect(admin.role).toBe(UserRole.ADMIN);
    });
  });

  describe('Task Operations', () => {
    let user: User;
    let admin: User;

    beforeEach(async () => {
      user = await authService.register('user@example.com', 'password123');
      admin = await authService.register('admin@example.com', 'password123');
    });

    it('should create and retrieve a task', async () => {
      const task = await tasksService.create(
        {
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.TODO,
        },
        user,
      );

      expect(task).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.userId).toBe(user.id);

      const foundTask = await taskRepository.findOne({
        where: { id: task.id },
        relations: ['user'],
      });
      expect(foundTask).toBeDefined();
      expect(foundTask?.user.id).toBe(user.id);
    });

    it('should allow admin to access all tasks', async () => {
      const task = await tasksService.create(
        {
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.TODO,
        },
        user,
      );

      const adminTask = await tasksService.findOne(task.id, admin);
      expect(adminTask).toBeDefined();
      expect(adminTask.id).toBe(task.id);
    });

    it('should not allow user to access other users tasks', async () => {
      const task = await tasksService.create(
        {
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.TODO,
        },
        user,
      );

      const otherUser = await authService.register('other@example.com', 'password123');
      await expect(tasksService.findOne(task.id, otherUser)).rejects.toThrow();
    });

    it('should handle task pagination correctly', async () => {
      // Create multiple tasks
      for (let i = 0; i < 15; i++) {
        await tasksService.create(
          {
            title: `Task ${i}`,
            description: `Description ${i}`,
            status: TaskStatus.TODO,
          },
          user,
        );
      }

      const page1 = await tasksService.findAll(user, undefined, undefined, 1, 10);
      expect(page1.tasks.length).toBe(10);
      expect(page1.total).toBe(15);

      const page2 = await tasksService.findAll(user, undefined, undefined, 2, 10);
      expect(page2.tasks.length).toBe(5);
      expect(page2.total).toBe(15);
    });

    it('should handle task filtering correctly', async () => {
      // Create tasks with different statuses
      await tasksService.create(
        {
          title: 'Task 1',
          description: 'Description 1',
          status: TaskStatus.TODO,
        },
        user,
      );

      await tasksService.create(
        {
          title: 'Task 2',
          description: 'Description 2',
          status: TaskStatus.IN_PROGRESS,
        },
        user,
      );

      await tasksService.create(
        {
          title: 'Task 3',
          description: 'Description 3',
          status: TaskStatus.DONE,
        },
        user,
      );

      const todoTasks = await tasksService.findAll(
        user,
        TaskStatus.TODO,
        undefined,
        1,
        10,
      );
      expect(todoTasks.tasks.length).toBe(1);
      expect(todoTasks.tasks[0].status).toBe(TaskStatus.TODO);

      const inProgressTasks = await tasksService.findAll(
        user,
        TaskStatus.IN_PROGRESS,
        undefined,
        1,
        10,
      );
      expect(inProgressTasks.tasks.length).toBe(1);
      expect(inProgressTasks.tasks[0].status).toBe(TaskStatus.IN_PROGRESS);
    });
  });
}); 