import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { FilterCardsDto } from './dto/filter-cards.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinWorldRole, WorldRoleGuard } from '../worlds/guards/world-role.guard';
import { WorldRole } from '@proj/database';

@Controller('worlds/:worldId/cards')
@UseGuards(JwtAuthGuard, WorldRoleGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  @MinWorldRole(WorldRole.EDITOR)
  async create(
    @Param('worldId') worldId: string,
    @Body() dto: CreateCardDto,
  ) {
    return this.cardsService.create(worldId, dto);
  }

  @Get()
  @MinWorldRole(WorldRole.VIEWER)
  async findAll(
    @Param('worldId') worldId: string,
    @Query() filters: FilterCardsDto,
  ) {
    return this.cardsService.findAll(worldId, filters);
  }

  @Get(':id')
  @MinWorldRole(WorldRole.VIEWER)
  async findOne(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.cardsService.findOne(worldId, id);
  }

  @Get(':id/references')
  @MinWorldRole(WorldRole.VIEWER)
  async getReferences(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.cardsService.getReferences(worldId, id);
  }

  @Patch(':id')
  @MinWorldRole(WorldRole.EDITOR)
  async update(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardsService.update(worldId, id, dto);
  }

  @Delete(':id')
  @MinWorldRole(WorldRole.EDITOR)
  async softDelete(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.cardsService.softDelete(worldId, id);
  }
}

