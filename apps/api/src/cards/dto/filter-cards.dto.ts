import { IsOptional, IsString } from 'class-validator';

export class FilterCardsDto {
  @IsString()
  @IsOptional()
  folderId?: string;

  @IsString()
  @IsOptional()
  cardTypeId?: string;

  @IsString()
  @IsOptional()
  parentCardId?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
