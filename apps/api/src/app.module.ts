import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorldsModule } from './worlds/worlds.module';
import { FoldersModule } from './folders/folders.module';
import { CardTypesModule } from './card-types/card-types.module';
import { CardsModule } from './cards/cards.module';
import { TrashModule } from './trash/trash.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    AuthModule,
    WorldsModule,
    FoldersModule,
    CardTypesModule,
    CardsModule,
    TrashModule,
    RealtimeModule,
  ],
})
export class AppModule {}
