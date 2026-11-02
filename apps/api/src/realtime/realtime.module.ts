import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { HocuspocusService } from './hocuspocus.service';
import { MentionSyncWorker } from './workers/mention-sync.worker';
import { RealtimeController } from './realtime.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    BullModule.registerQueue({
      name: 'mentions-queue',
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
  ],
  controllers: [RealtimeController],
  providers: [HocuspocusService, MentionSyncWorker],
  exports: [HocuspocusService, MentionSyncWorker],
})
export class RealtimeModule {}
