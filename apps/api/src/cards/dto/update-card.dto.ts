import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyValueInputDto } from './create-card.dto';

export class UpdateCardDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(150)
  title?: string;

  @IsString()
  @IsOptional()
  cardTypeId?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  folderId?: string | null;

  @IsString()
  @IsOptional()
  parentCardId?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aliases?: string[];

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyValueInputDto)
  @IsOptional()
  propertyValues?: PropertyValueInputDto[];
}

