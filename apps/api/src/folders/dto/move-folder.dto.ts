import { IsOptional, IsString, IsInt, ValidateIf } from 'class-validator';

export class MoveFolderDto {
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsString()
  @IsOptional()
  newParentId?: string | null;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

