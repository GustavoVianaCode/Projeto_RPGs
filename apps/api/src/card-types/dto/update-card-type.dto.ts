import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCardTypeDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsString()
  @IsOptional()
  parentTypeId?: string | null;

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

