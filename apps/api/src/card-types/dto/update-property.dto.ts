import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PropertyType } from '@proj/database';

export class UpdatePropertyDefinitionDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @IsOptional()
  options?: any;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

