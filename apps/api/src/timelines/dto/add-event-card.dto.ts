import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddEventCardDto {
  @IsString()
  @IsNotEmpty()
  cardId: string;

  @IsOptional()
  @IsString()
  role?: string;
}

