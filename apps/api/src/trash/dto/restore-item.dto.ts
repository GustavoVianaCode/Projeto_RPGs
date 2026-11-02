import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum TrashItemType {
  FOLDER = 'FOLDER',
  CARD = 'CARD',
}

export class RestoreItemDto {
  @IsEnum(TrashItemType)
  itemType!: TrashItemType;

  @IsString()
  @IsNotEmpty()
  id!: string;
}
