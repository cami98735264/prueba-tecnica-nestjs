import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Completar informe',
    description: 'Título de la tarea',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Escribir el informe mensual de ventas',
    description: 'Descripción detallada de la tarea',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'TODO',
    description: 'Estado de la tarea',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({
    example: '2024-04-15T00:00:00.000Z',
    description: 'Fecha de vencimiento de la tarea',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: Date;
}

export class UpdateTaskDto {
  @ApiProperty({
    example: 'Completar informe',
    description: 'Título de la tarea',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'Escribir el informe mensual de ventas',
    description: 'Descripción detallada de la tarea',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'IN_PROGRESS',
    description: 'Estado de la tarea',
    enum: TaskStatus,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({
    example: '2024-04-15T00:00:00.000Z',
    description: 'Fecha de vencimiento de la tarea',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: Date;
} 