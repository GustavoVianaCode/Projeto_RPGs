import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTimelineEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  dateText?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cardId?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

