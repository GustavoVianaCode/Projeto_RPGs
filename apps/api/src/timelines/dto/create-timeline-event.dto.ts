import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTimelineEventDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  dateText: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cardId?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

