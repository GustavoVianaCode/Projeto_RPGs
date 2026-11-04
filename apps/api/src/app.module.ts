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
import { SearchModule } from './search/search.module';
import { TimelinesModule } from './timelines/timelines.module';
import { VersionsModule } from './versions/versions.module';

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
    SearchModule,
    TimelinesModule,
    VersionsModule,
  ],
})
export class AppModule {}
