import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorldsModule } from './worlds/worlds.module';

@Module({
  imports: [PrismaModule, AuthModule, WorldsModule],
})
export class AppModule {}
