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
      update: jest.Mock;
      updateMany: jest.Mock;
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
      update: jest.fn(),
      updateMany: jest.fn(),
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

  describe('Timelines', () => {
    it('should create a timeline for a world', async () => {
      const now = new Date();
      mockPrisma.timeline.create.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        name: 'História Antiga',
        description: 'Eras antes da grande guerra',
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
          color: '#6366f1',
          icon: 'book',
          sortOrder: 0,
        },
        include: {
          _count: {
            select: { events: { where: { deletedAt: null } } },
          },
        },
      });
      expect(result.id).toBe('t-1');
    });

    it('should throw NotFoundException when timeline is not found in world', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue(null);

      await expect(service.findOneTimeline('w-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Events and Multi-tenancy / Anti-IDOR', () => {
    it('should create an event when timeline exists and linked card belongs to the same world', async () => {
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

      const res = await service.createEvent('w-1', 't-1', {
        title: 'Queda do Império',
        dateText: 'Ano 120 da 3ª Era',
        cardId: 'card-1',
      });

      expect(res.id).toBe('ev-1');
      expect(mockPrisma.card.findFirst).toHaveBeenCalledWith({
        where: { id: 'card-1', worldId: 'w-1', deletedAt: null },
      });
    });

    it('should reject creating event if linked card belongs to a different world (Anti-IDOR)', async () => {
      mockPrisma.timeline.findFirst.mockResolvedValue({
        id: 't-1',
        worldId: 'w-1',
        deletedAt: null,
      });
      // Card not found in world w-1
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
});
