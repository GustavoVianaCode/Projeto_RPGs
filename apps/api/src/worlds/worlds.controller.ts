import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorldsService } from './worlds.service';
import { CreateWorldDto } from './dto/create-world.dto';
import { UpdateWorldDto } from './dto/update-world.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MinWorldRole, WorldRoleGuard } from './guards/world-role.guard';
import { WorldRole } from '@proj/database';

@Controller('worlds')
@UseGuards(JwtAuthGuard)
export class WorldsController {
  constructor(private readonly worldsService: WorldsService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorldDto,
  ) {
    return this.worldsService.create(userId, dto);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.worldsService.findAllUserWorlds(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') worldId: string,
  ) {
    return this.worldsService.findOne(userId, worldId);
  }

  @Patch(':id')
  @UseGuards(WorldRoleGuard)
  @MinWorldRole(WorldRole.ADMIN)
  async update(
    @Param('id') worldId: string,
    @Body() dto: UpdateWorldDto,
  ) {
    return this.worldsService.update(worldId, dto);
  }

  @Delete(':id')
  @UseGuards(WorldRoleGuard)
  @MinWorldRole(WorldRole.OWNER)
  async remove(@Param('id') worldId: string) {
    return this.worldsService.softDelete(worldId);
  }
}

