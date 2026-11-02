import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCardTypeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'The slug must contain only lowercase alphanumeric characters and hyphens',
  })
  slug!: string;

  @IsString()
  @IsOptional()
  parentTypeId?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsOptional()
  defaultBlocks?: any;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

