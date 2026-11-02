import { Module } from '@nestjs/common';
import { WorldsService } from './worlds.service';
import { WorldsController } from './worlds.controller';
import { WorldRoleGuard } from './guards/world-role.guard';

@Module({
  controllers: [WorldsController],
  providers: [WorldsService, WorldRoleGuard],
  exports: [WorldsService],
})
export class WorldsModule {}

