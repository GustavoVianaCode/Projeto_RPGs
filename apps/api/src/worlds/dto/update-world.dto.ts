import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateWorldDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  description?: string;
}
