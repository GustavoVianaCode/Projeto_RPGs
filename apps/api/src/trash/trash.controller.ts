import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TrashService } from './trash.service';
import { RestoreItemDto } from './dto/restore-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinWorldRole, WorldRoleGuard } from '../worlds/guards/world-role.guard';
import { WorldRole } from '@proj/database';

@Controller('worlds/:worldId/trash')
@UseGuards(JwtAuthGuard, WorldRoleGuard)
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Get()
  @MinWorldRole(WorldRole.VIEWER)
  async getTrash(@Param('worldId') worldId: string) {
    return this.trashService.getTrash(worldId);
  }

  @Post('restore')
  @MinWorldRole(WorldRole.EDITOR)
  async restore(
    @Param('worldId') worldId: string,
    @Body() dto: RestoreItemDto,
  ) {
    return this.trashService.restore(worldId, dto);
  }
}
