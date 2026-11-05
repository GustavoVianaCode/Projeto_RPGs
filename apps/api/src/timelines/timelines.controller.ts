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
import { TimelinesService } from './timelines.service';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { UpdateTimelineEventDto } from './dto/update-timeline-event.dto';
import { AddEventCardDto } from './dto/add-event-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinWorldRole, WorldRoleGuard } from '../worlds/guards/world-role.guard';
import { WorldRole } from '@proj/database';

@Controller('worlds/:worldId/timelines')
@UseGuards(JwtAuthGuard, WorldRoleGuard)
export class TimelinesController {
  constructor(private readonly timelinesService: TimelinesService) {}

  @Post()
  @MinWorldRole(WorldRole.EDITOR)
  async create(
    @Param('worldId') worldId: string,
    @Body() dto: CreateTimelineDto,
  ) {
    return this.timelinesService.createTimeline(worldId, dto);
  }

  @Get()
  @MinWorldRole(WorldRole.VIEWER)
  async findAll(
    @Param('worldId') worldId: string,
    @Query('folderId') folderId?: string,
  ) {
    return this.timelinesService.findAllTimelines(worldId, folderId);
  }

  @Get(':id')
  @MinWorldRole(WorldRole.VIEWER)
  async findOne(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.timelinesService.findOneTimeline(worldId, id);
  }

  @Patch(':id')
  @MinWorldRole(WorldRole.EDITOR)
  async update(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTimelineDto,
  ) {
    return this.timelinesService.updateTimeline(worldId, id, dto);
  }

  @Delete(':id')
  @MinWorldRole(WorldRole.EDITOR)
  async delete(
    @Param('worldId') worldId: string,
    @Param('id') id: string,
  ) {
    return this.timelinesService.deleteTimeline(worldId, id);
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  @Post(':id/events')
  @MinWorldRole(WorldRole.EDITOR)
  async createEvent(
    @Param('worldId') worldId: string,
    @Param('id') timelineId: string,
    @Body() dto: CreateTimelineEventDto,
  ) {
    return this.timelinesService.createEvent(worldId, timelineId, dto);
  }

  @Get(':id/events')
  @MinWorldRole(WorldRole.VIEWER)
  async findAllEvents(
    @Param('worldId') worldId: string,
    @Param('id') timelineId: string,
  ) {
    return this.timelinesService.findAllEvents(worldId, timelineId);
  }

  @Get(':id/events/:eventId')
  @MinWorldRole(WorldRole.VIEWER)
  async findOneEvent(
    @Param('worldId') worldId: string,
    @Param('id') timelineId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.timelinesService.findOneEvent(worldId, timelineId, eventId);
  }

  @Patch(':id/events/:eventId')
  @MinWorldRole(WorldRole.EDITOR)
  async updateEvent(
    @Param('worldId') worldId: string,
    @Param('id') timelineId: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateTimelineEventDto,
  ) {
    return this.timelinesService.updateEvent(worldId, timelineId, eventId, dto);
  }

  @Delete(':id/events/:eventId')
  @MinWorldRole(WorldRole.EDITOR)
  async deleteEvent(
    @Param('worldId') worldId: string,
    @Param('id') timelineId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.timelinesService.deleteEvent(worldId, timelineId, eventId);
  }

  // ─── Event-Card Links (TimelineEventCard) ───────────────────────────────────

  @Post(':id/events/:eventId/cards')
  @MinWorldRole(WorldRole.EDITOR)
  async addEventCard(
    @Param('worldId') worldId: string,
    @Param('id') timelineId: string,
    @Param('eventId') eventId: string,
    @Body() dto: AddEventCardDto,
  ) {
    return this.timelinesService.addEventCard(worldId, timelineId, eventId, dto);
  }

  @Delete(':id/events/:eventId/cards/:cardId')
  @MinWorldRole(WorldRole.EDITOR)
  async removeEventCard(
    @Param('worldId') worldId: string,
    @Param('id') timelineId: string,
    @Param('eventId') eventId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.timelinesService.removeEventCard(
      worldId,
      timelineId,
      eventId,
      cardId,
    );
  }
}
