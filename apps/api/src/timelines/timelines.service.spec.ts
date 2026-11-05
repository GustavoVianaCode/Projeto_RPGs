import { Test, TestingModule } from '@nestjs/testing';
import { TimelinesService } from './timelines.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TimelinesService', () => {
  let service: TimelinesService;

  type MockPrismaType = {
    timeline: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    timelineEvent: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    timelineEventCard: {
      create: jest.Mock;
      upsert: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    folder: {
      findFirst: jest.Mock;
    };
    card: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockPrisma: MockPrismaType = {
    timeline: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    timelineEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    timelineEventCard: {
      create: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    folder: {
      findFirst: jest.fn(),
    },
    card: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: MockPrismaType) => unknown) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelinesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TimelinesService>(TimelinesService);
    jest.clearAllMocks();
  });

  describe('Timelines CRUD & Folder association', () => {
    it('should create a timeline for a world without folder', async () => {
      const now = new Date();
      mockPrisma.timeline.create.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        name: 'História Antiga',
        description: 'Eras antes da grande guerra',
        folderId: null,
        color: '#6366f1',
        icon: 'book',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      const result = await service.createTimeline('w-1', {
        name: 'História Antiga',
        description: 'Eras antes da grande guerra',
        color: '#6366f1',
        icon: 'book',
      });

      expect(mockPrisma.timeline.create).toHaveBeenCalledWith({
        data: {
          worldId: 'w-1',
          name: 'História Antiga',
          description: 'Eras antes da grande guerra',
          folderId: null,
          color: '#6366f1',
          icon: 'book',
          sortOrder: 0,
        },
        include: {
          folder: { select: { id: true, name: true } },
          _count: {
            select: { events: { where: { deletedAt: null } } },
          },
        },
      });
      expect(result.id).toBe('t-1');
    });

    it('should create a timeline inside a valid folder', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue({
        id: 'f-1',
        worldId: 'w-1',
        name: 'Campanhas',
        deletedAt: null,
      });
      mockPrisma.timeline.create.mockResolvedValue({
        id: 't-2',
        worldId: 'w-1',
        folderId: 'f-1',
        name: 'Linha do Tempo 2',
      });

      const result = await service.createTimeline('w-1', {
        name: 'Linha do Tempo 2',
        folderId: 'f-1',
      });

      expect(mockPrisma.folder.findFirst).toHaveBeenCalledWith({
        where: { id: 'f-1', worldId: 'w-1', deletedAt: null },
      });
      expect(result.id).toBe('t-2');
    });

    it('should reject creating timeline if folder belongs to another world (Anti-IDOR)', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue(null);

      await expect(
        service.createTimeline('w-1', {
          name: 'Timeline Inválida',
          folderId: 'foreign-folder',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when timeline is not found in world', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue(null);

      await expect(service.findOneTimeline('w-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Events and Multi-tenancy / Anti-IDOR', () => {
    it('should create an event with linked cards', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.card.findFirst.mockResolvedValue({
        id: 'card-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.timelineEvent.create.mockResolvedValue({
        id: 'ev-1',
        worldId: 'w-1',
        timelineId: 't-1',
        title: 'Queda do Império',
        dateText: 'Ano 120 da 3ª Era',
        cardId: 'card-1',
      });
      mockPrisma.timelineEvent.findUniqueOrThrow.mockResolvedValue({
        id: 'ev-1',
        worldId: 'w-1',
        title: 'Queda do Império',
        card: { id: 'card-1', title: 'Império Valiriano' },
        eventCards: [{ id: 'link-1', cardId: 'card-1', role: 'Palco da Batalha' }],
      });

      const res = await service.createEvent('w-1', 't-1', {
        title: 'Queda do Império',
        dateText: 'Ano 120 da 3ª Era',
        cards: [{ cardId: 'card-1', role: 'Palco da Batalha' }],
      });

      expect(res.id).toBe('ev-1');
      expect(mockPrisma.card.findFirst).toHaveBeenCalledWith({
        where: { id: 'card-1', worldId: 'w-1', deletedAt: null },
      });
      expect(mockPrisma.timelineEventCard.create).toHaveBeenCalledWith({
        data: {
          worldId: 'w-1',
          eventId: 'ev-1',
          cardId: 'card-1',
          role: 'Palco da Batalha',
        },
      });
    });

    it('should reject creating event if linked card belongs to a different world (Anti-IDOR)', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.createEvent('w-1', 't-1', {
          title: 'Ataque ao Castelo',
          dateText: 'Ano 50',
          cardId: 'foreign-card-99',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should soft-delete timeline and cascade delete events in a transaction', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.timeline.update.mockResolvedValue({ id: 't-1', deletedAt: new Date() });

      await service.deleteTimeline('w-1', 't-1');

      expect(mockPrisma.timelineEvent.updateMany).toHaveBeenCalledWith({
        where: { timelineId: 't-1', worldId: 'w-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockPrisma.timeline.update).toHaveBeenCalledWith({
        where: { id_worldId: { id: 't-1', worldId: 'w-1' } },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('TimelineEventCard Links Management', () => {
    it('should link a card to an event with a role', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.timelineEvent.findFirst.mockResolvedValue({
        id: 'ev-1',
        timelineId: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.card.findFirst.mockResolvedValue({
        id: 'card-hero',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.timelineEventCard.upsert.mockResolvedValue({
        id: 'link-1',
        worldId: 'w-1',
        eventId: 'ev-1',
        cardId: 'card-hero',
        role: 'Protagonista',
      });

      const link = await service.addEventCard('w-1', 't-1', 'ev-1', {
        cardId: 'card-hero',
        role: 'Protagonista',
      });

      expect(mockPrisma.timelineEventCard.upsert).toHaveBeenCalledWith({
        where: { eventId_cardId: { eventId: 'ev-1', cardId: 'card-hero' } },
        create: {
          worldId: 'w-1',
          eventId: 'ev-1',
          cardId: 'card-hero',
          role: 'Protagonista',
        },
        update: {
          role: 'Protagonista',
        },
        include: {
          card: expect.any(Object),
        },
      });
      expect(link.role).toBe('Protagonista');
    });

    it('should reject linking card from a foreign world (Anti-IDOR)', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.timelineEvent.findFirst.mockResolvedValue({
        id: 'ev-1',
        timelineId: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.card.findFirst.mockResolvedValue(null); // Foreign card

      await expect(
        service.addEventCard('w-1', 't-1', 'ev-1', {
          cardId: 'alien-card',
          role: 'Invasor',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove an event-card link', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.timelineEvent.findFirst.mockResolvedValue({
        id: 'ev-1',
        timelineId: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      mockPrisma.timelineEventCard.findUnique.mockResolvedValue({
        eventId: 'ev-1',
        cardId: 'card-hero',
      });
      mockPrisma.timelineEventCard.delete.mockResolvedValue({
        eventId: 'ev-1',
        cardId: 'card-hero',
      });

      const res = await service.removeEventCard('w-1', 't-1', 'ev-1', 'card-hero');

      expect(mockPrisma.timelineEventCard.delete).toHaveBeenCalledWith({
        where: { eventId_cardId: { eventId: 'ev-1', cardId: 'card-hero' } },
      });
      expect(res.success).toBe(true);
    });
  });
});
