import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PropertyType } from '@proj/database';

export class CreatePropertyDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'The slug must contain only lowercase alphanumeric characters, underscores and hyphens',
  })
  slug!: string;

  @IsEnum(PropertyType)
  type!: PropertyType;

  @IsOptional()
  options?: any;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

