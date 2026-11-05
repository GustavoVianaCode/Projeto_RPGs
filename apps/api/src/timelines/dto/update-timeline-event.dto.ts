import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { EventCardLinkDto } from './create-timeline-event.dto';

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventCardLinkDto)
  cards?: EventCardLinkDto[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
