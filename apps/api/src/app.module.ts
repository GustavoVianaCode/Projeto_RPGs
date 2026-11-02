import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorldsModule } from './worlds/worlds.module';
import { FoldersModule } from './folders/folders.module';
import { CardTypesModule } from './card-types/card-types.module';
import { CardsModule } from './cards/cards.module';
import { TrashModule } from './trash/trash.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WorldsModule,
    FoldersModule,
    CardTypesModule,
    CardsModule,
    TrashModule,
  ],
})
export class AppModule {}
