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
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinWorldRole, WorldRoleGuard } from '../worlds/guards/world-role.guard';
import { WorldRole } from '@proj/database';

@Controller('worlds/:worldId/folders')
@UseGuards(JwtAuthGuard, WorldRoleGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @MinWorldRole(WorldRole.EDITOR)
  async create(
    @Param('worldId') worldId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.foldersService.create(worldId, dto);
  }

  @Get()
  @MinWorldRole(WorldRole.VIEWER)
  async findAll(@Param('worldId') worldId: string) {
    return this.foldersService.findAll(worldId);
  }

  @Get('tree')
  @MinWorldRole(WorldRole.VIEWER)
  async findTree(@Param('worldId') worldId: string) {
    return this.foldersService.findTree(worldId);
  }

  @Get(':id')
  @MinWorldRole(WorldRole.VIEWER)
  async findOne(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.foldersService.findOne(worldId, id);
  }

  @Patch(':id')
  @MinWorldRole(WorldRole.EDITOR)
  async update(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(worldId, id, dto);
  }

  @Patch(':id/move')
  @MinWorldRole(WorldRole.EDITOR)
  async move(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
    @Body() dto: MoveFolderDto,
  ) {
    return this.foldersService.move(worldId, id, dto);
  }

  @Delete(':id')
  @MinWorldRole(WorldRole.EDITOR)
  async softDelete(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.foldersService.softDelete(worldId, id);
  }
}
