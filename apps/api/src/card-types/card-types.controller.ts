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
import { CardTypesService } from './card-types.service';
import { CreateCardTypeDto } from './dto/create-card-type.dto';
import { UpdateCardTypeDto } from './dto/update-card-type.dto';
import { CreatePropertyDefinitionDto } from './dto/create-property.dto';
import { UpdatePropertyDefinitionDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinWorldRole, WorldRoleGuard } from '../worlds/guards/world-role.guard';
import { WorldRole } from '@proj/database';

@Controller('worlds/:worldId/card-types')
@UseGuards(JwtAuthGuard, WorldRoleGuard)
export class CardTypesController {
  constructor(private readonly cardTypesService: CardTypesService) {}

  @Post()
  @MinWorldRole(WorldRole.EDITOR)
  async create(
    @Param('worldId') worldId: string,
    @Body() dto: CreateCardTypeDto,
  ) {
    return this.cardTypesService.create(worldId, dto);
  }

  @Get()
  @MinWorldRole(WorldRole.VIEWER)
  async findAll(@Param('worldId') worldId: string) {
    return this.cardTypesService.findAll(worldId);
  }

  @Get(':id')
  @MinWorldRole(WorldRole.VIEWER)
  async findOne(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.cardTypesService.findOne(worldId, id);
  }

  @Patch(':id')
  @MinWorldRole(WorldRole.EDITOR)
  async update(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCardTypeDto,
  ) {
    return this.cardTypesService.update(worldId, id, dto);
  }

  @Delete(':id')
  @MinWorldRole(WorldRole.EDITOR)
  async softDelete(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.cardTypesService.softDelete(worldId, id);
  }

  // --------------------------------------------------------------------------
  // Property Definitions Sub-routes
  // --------------------------------------------------------------------------

  @Post(':cardTypeId/properties')
  @MinWorldRole(WorldRole.EDITOR)
  async createProperty(
    @Param('worldId') worldId: string,
    @Param('cardTypeId') cardTypeId: string,
    @Body() dto: CreatePropertyDefinitionDto,
  ) {
    return this.cardTypesService.createProperty(worldId, cardTypeId, dto);
  }

  @Get(':cardTypeId/properties')
  @MinWorldRole(WorldRole.VIEWER)
  async findAllProperties(
    @Param('worldId') worldId: string,
    @Param('cardTypeId') cardTypeId: string,
  ) {
    return this.cardTypesService.findAllProperties(worldId, cardTypeId);
  }

  @Patch(':cardTypeId/properties/:id')
  @MinWorldRole(WorldRole.EDITOR)
  async updateProperty(
    @Param('worldId') worldId: string,
    @Param('cardTypeId') cardTypeId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDefinitionDto,
  ) {
    return this.cardTypesService.updateProperty(worldId, cardTypeId, id, dto);
  }

  @Delete(':cardTypeId/properties/:id')
  @MinWorldRole(WorldRole.EDITOR)
  async deleteProperty(
    @Param('worldId') worldId: string,
    @Param('cardTypeId') cardTypeId: string,
    @Param('id') id: string,
  ) {
    return this.cardTypesService.deleteProperty(worldId, cardTypeId, id);
  }
}
