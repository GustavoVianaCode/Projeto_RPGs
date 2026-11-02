import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateWorldDto {
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
  @MaxLength(300)
  description?: string;
}

