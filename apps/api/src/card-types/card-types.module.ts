import { Module } from '@nestjs/common';
import { CardTypesService } from './card-types.service';
import { CardTypesController } from './card-types.controller';

@Module({
  controllers: [CardTypesController],
  providers: [CardTypesService],
  exports: [CardTypesService],
})
export class CardTypesModule {}

