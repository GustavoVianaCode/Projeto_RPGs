import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimelineDto } from './dto/create-timeline.dto';
import { UpdateTimelineDto } from './dto/update-timeline.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { UpdateTimelineEventDto } from './dto/update-timeline-event.dto';

@Injectable()
export class TimelinesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Timelines ─────────────────────────────────────────────────────────────

  async createTimeline(worldId: string, dto: CreateTimelineDto) {
    return this.prisma.timeline.create({
      data: {
        worldId,
        name: dto.name,
        description: dto.description || null,
        color: dto.color || null,
        icon: dto.icon || null,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        _count: {
          select: { events: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async findAllTimelines(worldId: string) {
    return this.prisma.timeline.findMany({
      where: {
        worldId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { events: { where: { deletedAt: null } } },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOneTimeline(worldId: string, id: string) {
    const timeline = await this.prisma.timeline.findFirst({
      where: {
        id,
        worldId,
        deletedAt: null,
      },
      include: {
        events: {
          where: { deletedAt: null },
          include: {
            card: {
              select: {
                id: true,
                title: true,
                slug: true,
                icon: true,
                documentId: true,
                cardType: { select: { id: true, name: true, color: true } },
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: { events: { where: { deletedAt: null } } },
        },
      },
    });

    if (!timeline) {
      throw new NotFoundException('Timeline not found in this world.');
    }

    return timeline;
  }

  async updateTimeline(worldId: string, id: string, dto: UpdateTimelineDto) {
    const existing = await this.prisma.timeline.findFirst({
      where: { id, worldId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Timeline not found in this world.');
    }

    return this.prisma.timeline.update({
      where: { id_worldId: { id, worldId } },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteTimeline(worldId: string, id: string) {
    const existing = await this.prisma.timeline.findFirst({
      where: { id, worldId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Timeline not found in this world.');
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Soft-delete all events in timeline
      await tx.timelineEvent.updateMany({
        where: { timelineId: id, worldId, deletedAt: null },
        data: { deletedAt: now },
      });

      return tx.timeline.update({
        where: { id_worldId: { id, worldId } },
        data: { deletedAt: now },
      });
    });
  }

  // ─── Events ─────────────────────────────────────────────────────────────────

  async createEvent(worldId: string, timelineId: string, dto: CreateTimelineEventDto) {
    // 1. Validate timeline belongs to world and is active
    const timeline = await this.prisma.timeline.findFirst({
      where: { id: timelineId, worldId, deletedAt: null },
    });
    if (!timeline) {
      throw new NotFoundException('Timeline not found in this world.');
    }

    // 2. Validate card if linked (Anti-IDOR)
    if (dto.cardId) {
      const card = await this.prisma.card.findFirst({
        where: { id: dto.cardId, worldId, deletedAt: null },
      });
      if (!card) {
        throw new BadRequestException('Linked card not found in this world.');
      }
    }

    return this.prisma.timelineEvent.create({
      data: {
        worldId,
        timelineId,
        title: dto.title,
        description: dto.description || null,
        dateText: dto.dateText,
        cardId: dto.cardId || null,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            slug: true,
            icon: true,
            documentId: true,
          },
        },
      },
    });
  }

  async findAllEvents(worldId: string, timelineId: string) {
    const timeline = await this.prisma.timeline.findFirst({
      where: { id: timelineId, worldId, deletedAt: null },
    });
    if (!timeline) {
      throw new NotFoundException('Timeline not found in this world.');
    }

    return this.prisma.timelineEvent.findMany({
      where: {
        timelineId,
        worldId,
        deletedAt: null,
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            slug: true,
            icon: true,
            documentId: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateEvent(
    worldId: string,
    timelineId: string,
    eventId: string,
    dto: UpdateTimelineEventDto,
  ) {
    const event = await this.prisma.timelineEvent.findFirst({
      where: { id: eventId, timelineId, worldId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException('Timeline event not found.');
    }

    if (dto.cardId) {
      const card = await this.prisma.card.findFirst({
        where: { id: dto.cardId, worldId, deletedAt: null },
      });
      if (!card) {
        throw new BadRequestException('Linked card not found in this world.');
      }
    }

    return this.prisma.timelineEvent.update({
      where: { id_worldId: { id: eventId, worldId } },
      data: {
        title: dto.title,
        description: dto.description,
        dateText: dto.dateText,
        cardId: dto.cardId !== undefined ? dto.cardId : event.cardId,
        sortOrder: dto.sortOrder,
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            slug: true,
            icon: true,
            documentId: true,
          },
        },
      },
    });
  }

  async deleteEvent(worldId: string, timelineId: string, eventId: string) {
    const event = await this.prisma.timelineEvent.findFirst({
      where: { id: eventId, timelineId, worldId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException('Timeline event not found.');
    }

    return this.prisma.timelineEvent.update({
      where: { id_worldId: { id: eventId, worldId } },
      data: { deletedAt: new Date() },
    });
  }
}

