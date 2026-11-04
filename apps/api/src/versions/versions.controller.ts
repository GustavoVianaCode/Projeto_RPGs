import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { VersionsService } from './versions.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinWorldRole, WorldRoleGuard } from '../worlds/guards/world-role.guard';
import { WorldRole } from '@proj/database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('worlds/:worldId/cards/:cardId/versions')
@UseGuards(JwtAuthGuard, WorldRoleGuard)
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Post()
  @MinWorldRole(WorldRole.EDITOR)
  async createCheckpoint(
    @Param('worldId') worldId: string,
    @Param('cardId') cardId: string,
    @Body() dto: CreateVersionDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.versionsService.createCheckpoint(worldId, cardId, dto, userId);
  }

  @Get()
  @MinWorldRole(WorldRole.VIEWER)
  async listVersions(
    @Param('worldId') worldId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.versionsService.listVersions(worldId, cardId);
  }

  @Get(':versionId')
  @MinWorldRole(WorldRole.VIEWER)
  async getVersion(
    @Param('worldId') worldId: string,
    @Param('cardId') cardId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionsService.getVersion(worldId, cardId, versionId);
  }

  @Post(':versionId/restore')
  @MinWorldRole(WorldRole.EDITOR)
  async restoreVersion(
    @Param('worldId') worldId: string,
    @Param('cardId') cardId: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.versionsService.restoreVersion(worldId, cardId, versionId, userId);
  }
}

