import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  expiresAt: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsEnum(['Pending', 'In Progress', 'Expired'])
  status?: 'Pending' | 'In Progress' | 'Expired';

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
