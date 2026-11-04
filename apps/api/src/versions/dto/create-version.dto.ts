import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}

