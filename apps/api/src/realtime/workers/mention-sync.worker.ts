import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { extractMentionTargetIds, TipTapNode } from '@proj/shared';

export interface MentionSyncJobData {
  worldId: string;
  documentId: string;
  cardId?: string;
}

@Injectable()
@Processor('mentions-queue')
export class MentionSyncWorker extends WorkerHost {
  private readonly logger = new Logger(MentionSyncWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<MentionSyncJobData>): Promise<void> {
    const { worldId, documentId } = job.data;
    this.logger.debug(
      `Processing mentions sync for document ${documentId} in world ${worldId}`,
    );

    // 1. Fetch the latest document from Postgres (Anti-IDOR: filter by id AND worldId)
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, worldId, deletedAt: null },
      include: { card: true },
    });

    if (!document || !document.card) {
      this.logger.warn(
        `Document ${documentId} or linked card not found in world ${worldId}`,
      );
      return;
    }

    const sourceCardId = document.card.id;
    const content = (document.contentJson as TipTapNode) || null;

    // 2. Extract mention targetCardIds from TipTap AST
    const rawTargetCardIds = extractMentionTargetIds(content);

    // 3. Prevent self-mentions
    const candidateTargetIds = rawTargetCardIds.filter(
      (targetId) => targetId && targetId !== sourceCardId,
    );

    // 4. Validate that candidate targets exist and belong to the same world (Anti-IDOR)
    let validTargetIds = new Set<string>();
    if (candidateTargetIds.length > 0) {
      const validCards = await this.prisma.card.findMany({
        where: {
          id: { in: candidateTargetIds },
          worldId,
          deletedAt: null,
        },
        select: { id: true },
      });
      validTargetIds = new Set(validCards.map((c) => c.id));
    }

    // 5. Fetch existing mentions for this card
    const existingMentions = await this.prisma.mention.findMany({
      where: {
        sourceCardId,
        worldId,
      },
      select: { id: true, targetCardId: true },
    });

    const existingTargetMap = new Map(
      existingMentions.map((m) => [m.targetCardId, m.id]),
    );

    // 6. Identify deletions and insertions
    const toDeleteIds = existingMentions
      .filter((m) => !validTargetIds.has(m.targetCardId))
      .map((m) => m.id);

    const toInsert = Array.from(validTargetIds)
      .filter((targetId) => !existingTargetMap.has(targetId))
      .map((targetId) => ({
        worldId,
        sourceCardId,
        targetCardId: targetId,
      }));

    // 7. Synchronize atomically inside a transaction
    await this.prisma.$transaction(async (tx) => {
      if (toDeleteIds.length > 0) {
        await tx.mention.deleteMany({
          where: {
            id: { in: toDeleteIds },
            worldId,
          },
        });
      }

      if (toInsert.length > 0) {
        await tx.mention.createMany({
          data: toInsert,
          skipDuplicates: true,
        });
      }
    });

    this.logger.log(
      `Synchronized mentions for card ${sourceCardId}: removed ${toDeleteIds.length}, added ${toInsert.length}`,
    );
  }
}

