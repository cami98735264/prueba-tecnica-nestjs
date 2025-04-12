import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskStatus } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    if (!createTaskDto.title) {
      throw new BadRequestException('Title is required');
    }

    if (createTaskDto.status && !Object.values(TaskStatus).includes(createTaskDto.status)) {
      throw new BadRequestException('Invalid task status');
    }

    if (createTaskDto.dueDate && isNaN(new Date(createTaskDto.dueDate).getTime())) {
      throw new BadRequestException('Invalid due date format');
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
      user,
    });

    return this.taskRepository.save(task);
  }

  async findAll(
    user: User,
    status?: TaskStatus,
    dueDate?: Date,
    page?: number,
    limit?: number,
  ): Promise<{ tasks: Task[]; total: number }> {
    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    if (user.role !== 'ADMIN') {
      queryBuilder.where('task.userId = :userId', { userId: user.id });
    }

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (dueDate) {
      queryBuilder.andWhere('task.dueDate = :dueDate', { dueDate });
    }

    const skip = page ? (page - 1) * (limit || 10) : 0;
    const take = limit || 10;

    const [tasks, total] = await queryBuilder
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { tasks, total };
  }

  async findOne(id: string, user: User): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (user.role !== 'ADMIN' && task.user.id !== user.id) {
      throw new ForbiddenException('You do not have permission to access this task');
    }

    return task;
  }

  async update(id: string, updateTaskDto: Partial<Task>, user: User): Promise<Task> {
    const task = await this.findOne(id, user);

    if (updateTaskDto.status && !Object.values(TaskStatus).includes(updateTaskDto.status)) {
      throw new BadRequestException('Invalid task status');
    }

    if (updateTaskDto.dueDate && isNaN(new Date(updateTaskDto.dueDate).getTime())) {
      throw new BadRequestException('Invalid due date format');
    }

    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  async remove(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);
    await this.taskRepository.remove(task);
  }
} 