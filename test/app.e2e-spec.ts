import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { databaseConfig } from '../src/config/database.config';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Task, TaskStatus } from '../src/tasks/entities/task.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let taskRepository: Repository<Task>;
  let accessToken: string;
  let refreshToken: string;
  let adminAccessToken: string;
  let adminRefreshToken: string;
  let userId: string;
  let taskId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            JWT_SECRET: 'test-jwt-secret',
            JWT_EXPIRATION: '15m',
            REFRESH_TOKEN_SECRET: 'test-refresh-secret',
            REFRESH_TOKEN_EXPIRATION: '7d',
          })],
        }),
        TypeOrmModule.forRoot({
          ...databaseConfig as PostgresConnectionOptions,
          database: 'task_management_test',
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User, Task]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get('JWT_EXPIRATION'),
            },
          }),
          inject: [ConfigService],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    taskRepository = moduleFixture.get<Repository<Task>>(getRepositoryToken(Task));
  });

  beforeEach(async () => {
    await taskRepository.delete({});
    await userRepository.delete({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      userId = response.body.id;
    });

    it('should register an admin user', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe('admin@example.com');
          expect(res.body.role).toBe(UserRole.ADMIN);
        });
    });

    it('should login and get tokens', async () => {
      // First register the user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      accessToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('should refresh tokens', async () => {
      // First register and login
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: loginResponse.body.refresh_token,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
    });
  });

  describe('Tasks', () => {
    beforeEach(async () => {
      // Register and login before each task test
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      accessToken = loginResponse.body.access_token;
    });

    it('should create a task', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.TODO,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Task');
      expect(response.body.description).toBe('Test Description');
      expect(response.body.status).toBe(TaskStatus.TODO);
      taskId = response.body.id;
    });

    it('should get all tasks', async () => {
      // Create a task first
      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.TODO,
        });

      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.tasks.length).toBeGreaterThan(0);
      expect(response.body.tasks[0]).toHaveProperty('id');
      expect(response.body.tasks[0].title).toBe('Test Task');
    });

    it('should update a task', async () => {
      // Create a task first
      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.TODO,
        });

      const taskId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
        })
        .expect(200);

      expect(response.body.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should delete a task', async () => {
      // Create a task first
      const createResponse = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.TODO,
        });

      const taskId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify task is deleted
      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should get tasks with pagination', async () => {
      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/tasks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: `Test Task ${i}`,
            description: `Test Description ${i}`,
            status: i % 2 === 0 ? TaskStatus.TODO : TaskStatus.IN_PROGRESS,
          });
      }

      const response = await request(app.getHttpServer())
        .get('/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.tasks.length).toBe(2);
      expect(response.body.total).toBe(5);
    });

    it('should filter tasks by status', async () => {
      // Create tasks with different statuses
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Todo Task',
          description: 'Todo Description',
          status: TaskStatus.TODO,
        });

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'In Progress Task',
          description: 'In Progress Description',
          status: TaskStatus.IN_PROGRESS,
        });

      const response = await request(app.getHttpServer())
        .get(`/tasks?status=${TaskStatus.TODO}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.tasks.length).toBe(1);
      expect(response.body.tasks[0].status).toBe(TaskStatus.TODO);
    });

    it('should handle invalid pagination parameters', async () => {
      await request(app.getHttpServer())
        .get('/tasks?page=0&limit=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // First register and login
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: loginResponse.body.refresh_token,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
    });

    it('should fail to refresh tokens with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);
    });
  });
});
