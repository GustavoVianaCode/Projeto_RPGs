import { Test, TestingModule } from '@nestjs/testing';
import { MentionSyncWorker } from './mention-sync.worker';
import { PrismaService } from '../../prisma/prisma.service';
import { Job } from 'bullmq';

describe('MentionSyncWorker', () => {
  let worker: MentionSyncWorker;
  let prisma: {
    document: { findFirst: jest.Mock };
    card: { findMany: jest.Mock };
    mention: { findMany: jest.Mock; deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      document: { findFirst: jest.fn() },
      card: { findMany: jest.fn() },
      mention: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentionSyncWorker,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    worker = module.get<MentionSyncWorker>(MentionSyncWorker);
  });

  it('should ignore if document or linked card is missing', async () => {
    prisma.document.findFirst.mockResolvedValue(null);

    const job = {
      data: { worldId: 'w-1', documentId: 'doc-missing' },
    } as Job;

    await worker.process(job);

    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: { id: 'doc-missing', worldId: 'w-1', deletedAt: null },
      include: { card: true },
    });
    expect(prisma.mention.findMany).not.toHaveBeenCalled();
  });

  it('should synchronize mentions: remove old and insert new within transaction', async () => {
    const worldId = 'w-1';
    const documentId = 'doc-1';
    const sourceCardId = 'card-source';

    prisma.document.findFirst.mockResolvedValue({
      id: documentId,
      worldId,
      card: { id: sourceCardId },
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'mention', attrs: { id: 'target-1' } },
              { type: 'mention', attrs: { targetCardId: 'target-2' } },
              { type: 'mention', attrs: { id: sourceCardId } }, // self mention to be ignored
            ],
          },
        ],
      },
    });

    // Valid targets in world
    prisma.card.findMany.mockResolvedValue([
      { id: 'target-1' },
      { id: 'target-2' },
    ]);

    // Existing mentions in DB: target-1 and old-target
    prisma.mention.findMany.mockResolvedValue([
      { id: 'm-1', targetCardId: 'target-1' },
      { id: 'm-old', targetCardId: 'target-old' },
    ]);

    const job = {
      data: { worldId, documentId },
    } as Job;

    await worker.process(job);

    expect(prisma.$transaction).toHaveBeenCalled();
    // Should delete target-old
    expect(prisma.mention.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['m-old'] },
        worldId,
      },
    });
    // Should insert target-2 (target-1 was already present, sourceCard was filtered)
    expect(prisma.mention.createMany).toHaveBeenCalledWith({
      data: [
        {
          worldId,
          sourceCardId,
          targetCardId: 'target-2',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('should not allow mentions to cards from another world (Anti-IDOR)', async () => {
    const worldId = 'w-1';
    const documentId = 'doc-1';
    const sourceCardId = 'card-source';

    prisma.document.findFirst.mockResolvedValue({
      id: documentId,
      worldId,
      card: { id: sourceCardId },
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'mention', attrs: { id: 'alien-card-world-2' } }],
          },
        ],
      },
    });

    // Target does not exist in world 1
    prisma.card.findMany.mockResolvedValue([]);
    prisma.mention.findMany.mockResolvedValue([]);

    const job = {
      data: { worldId, documentId },
    } as Job;

    await worker.process(job);

    expect(prisma.card.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['alien-card-world-2'] },
        worldId,
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(prisma.mention.createMany).not.toHaveBeenCalled();
  });
});

