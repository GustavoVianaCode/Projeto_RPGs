import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class EventCardLinkDto {
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsOptional()
  @IsString()
  role?: string;
}

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventCardLinkDto)
  cards?: EventCardLinkDto[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
