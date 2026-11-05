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
import { AddEventCardDto } from './dto/add-event-card.dto';

const cardSelectFields = {
  id: true,
  title: true,
  slug: true,
  icon: true,
  documentId: true,
  cardType: { select: { id: true, name: true, color: true } },
};

@Injectable()
export class TimelinesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Timelines ─────────────────────────────────────────────────────────────

  async createTimeline(worldId: string, dto: CreateTimelineDto) {
    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, worldId, deletedAt: null },
      });
      if (!folder) {
        throw new BadRequestException('Folder not found in this world.');
      }
    }

    return this.prisma.timeline.create({
      data: {
        worldId,
        name: dto.name,
        description: dto.description || null,
        folderId: dto.folderId || null,
        color: dto.color || null,
        icon: dto.icon || null,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        folder: { select: { id: true, name: true } },
        _count: {
          select: { events: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async findAllTimelines(worldId: string, folderId?: string) {
    return this.prisma.timeline.findMany({
      where: {
        worldId,
        deletedAt: null,
        ...(folderId !== undefined ? { folderId: folderId || null } : {}),
      },
      include: {
        folder: { select: { id: true, name: true } },
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
        folder: { select: { id: true, name: true } },
        events: {
          where: { deletedAt: null },
          include: {
            card: { select: cardSelectFields },
            eventCards: {
              include: {
                card: { select: cardSelectFields },
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

    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, worldId, deletedAt: null },
      });
      if (!folder) {
        throw new BadRequestException('Folder not found in this world.');
      }
    }

    return this.prisma.timeline.update({
      where: { id_worldId: { id, worldId } },
      data: {
        name: dto.name,
        description: dto.description,
        folderId: dto.folderId !== undefined ? dto.folderId : existing.folderId,
        color: dto.color,
        icon: dto.icon,
        sortOrder: dto.sortOrder,
      },
      include: {
        folder: { select: { id: true, name: true } },
        _count: {
          select: { events: { where: { deletedAt: null } } },
        },
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
    const cardIdsToValidate = new Set<string>();
    if (dto.cardId) {
      cardIdsToValidate.add(dto.cardId);
    }
    if (dto.cards && dto.cards.length > 0) {
      dto.cards.forEach((c) => cardIdsToValidate.add(c.cardId));
    }

    for (const cardId of cardIdsToValidate) {
      const card = await this.prisma.card.findFirst({
        where: { id: cardId, worldId, deletedAt: null },
      });
      if (!card) {
        throw new BadRequestException(`Linked card ${cardId} not found in this world.`);
      }
    }

    // Determine primary cardId
    const primaryCardId =
      dto.cardId || (dto.cards && dto.cards.length > 0 ? dto.cards[0].cardId : null);

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.timelineEvent.create({
        data: {
          worldId,
          timelineId,
          title: dto.title,
          description: dto.description || null,
          dateText: dto.dateText,
          cardId: primaryCardId,
          sortOrder: dto.sortOrder ?? 0,
        },
      });

      // Insert event card relations
      if (dto.cards && dto.cards.length > 0) {
        for (const c of dto.cards) {
          await tx.timelineEventCard.create({
            data: {
              worldId,
              eventId: event.id,
              cardId: c.cardId,
              role: c.role || null,
            },
          });
        }
      } else if (dto.cardId) {
        await tx.timelineEventCard.create({
          data: {
            worldId,
            eventId: event.id,
            cardId: dto.cardId,
            role: null,
          },
        });
      }

      return tx.timelineEvent.findUniqueOrThrow({
        where: { id_worldId: { id: event.id, worldId } },
        include: {
          card: { select: cardSelectFields },
          eventCards: {
            include: {
              card: { select: cardSelectFields },
            },
          },
        },
      });
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
        card: { select: cardSelectFields },
        eventCards: {
          include: {
            card: { select: cardSelectFields },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOneEvent(worldId: string, timelineId: string, eventId: string) {
    const event = await this.prisma.timelineEvent.findFirst({
      where: { id: eventId, timelineId, worldId, deletedAt: null },
      include: {
        card: { select: cardSelectFields },
        eventCards: {
          include: {
            card: { select: cardSelectFields },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Timeline event not found in this world.');
    }

    return event;
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

    const cardIdsToValidate = new Set<string>();
    if (dto.cardId) {
      cardIdsToValidate.add(dto.cardId);
    }
    if (dto.cards && dto.cards.length > 0) {
      dto.cards.forEach((c) => cardIdsToValidate.add(c.cardId));
    }

    for (const cardId of cardIdsToValidate) {
      const card = await this.prisma.card.findFirst({
        where: { id: cardId, worldId, deletedAt: null },
      });
      if (!card) {
        throw new BadRequestException(`Linked card ${cardId} not found in this world.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let nextPrimaryCardId = event.cardId;
      if (dto.cardId !== undefined) {
        nextPrimaryCardId = dto.cardId;
      } else if (dto.cards !== undefined && dto.cards.length > 0) {
        nextPrimaryCardId = dto.cards[0].cardId;
      }

      await tx.timelineEvent.update({
        where: { id_worldId: { id: eventId, worldId } },
        data: {
          title: dto.title,
          description: dto.description,
          dateText: dto.dateText,
          cardId: nextPrimaryCardId,
          sortOrder: dto.sortOrder,
        },
      });

      if (dto.cards !== undefined) {
        // Replace eventCards with the provided set
        await tx.timelineEventCard.deleteMany({
          where: { eventId, worldId },
        });

        for (const c of dto.cards) {
          await tx.timelineEventCard.create({
            data: {
              worldId,
              eventId,
              cardId: c.cardId,
              role: c.role || null,
            },
          });
        }
      }

      return tx.timelineEvent.findUniqueOrThrow({
        where: { id_worldId: { id: eventId, worldId } },
        include: {
          card: { select: cardSelectFields },
          eventCards: {
            include: {
              card: { select: cardSelectFields },
            },
          },
        },
      });
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

  // ─── Event-Card Links (TimelineEventCard) ───────────────────────────────────

  async addEventCard(
    worldId: string,
    timelineId: string,
    eventId: string,
    dto: AddEventCardDto,
  ) {
    const timeline = await this.prisma.timeline.findFirst({
      where: { id: timelineId, worldId, deletedAt: null },
    });
    if (!timeline) {
      throw new NotFoundException('Timeline not found in this world.');
    }

    const event = await this.prisma.timelineEvent.findFirst({
      where: { id: eventId, timelineId, worldId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException('Timeline event not found.');
    }

    const card = await this.prisma.card.findFirst({
      where: { id: dto.cardId, worldId, deletedAt: null },
    });
    if (!card) {
      throw new BadRequestException('Linked card not found in this world.');
    }

    return this.prisma.timelineEventCard.upsert({
      where: { eventId_cardId: { eventId, cardId: dto.cardId } },
      create: {
        worldId,
        eventId,
        cardId: dto.cardId,
        role: dto.role || null,
      },
      update: {
        role: dto.role || null,
      },
      include: {
        card: { select: cardSelectFields },
      },
    });
  }

  async removeEventCard(
    worldId: string,
    timelineId: string,
    eventId: string,
    cardId: string,
  ) {
    const timeline = await this.prisma.timeline.findFirst({
      where: { id: timelineId, worldId, deletedAt: null },
    });
    if (!timeline) {
      throw new NotFoundException('Timeline not found in this world.');
    }

    const event = await this.prisma.timelineEvent.findFirst({
      where: { id: eventId, timelineId, worldId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException('Timeline event not found.');
    }

    const existingLink = await this.prisma.timelineEventCard.findUnique({
      where: { eventId_cardId: { eventId, cardId } },
    });
    if (!existingLink) {
      throw new NotFoundException('Event card link not found.');
    }

    await this.prisma.timelineEventCard.delete({
      where: { eventId_cardId: { eventId, cardId } },
    });

    return { success: true };
  }
}
