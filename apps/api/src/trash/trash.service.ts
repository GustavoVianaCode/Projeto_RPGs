import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestoreItemDto, TrashItemType } from './dto/restore-item.dto';

@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrash(worldId: string) {
    const folders = await this.prisma.folder.findMany({
      where: { worldId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        parentId: true,
        deletedAt: true,
      },
    });

    const cards = await this.prisma.card.findMany({
      where: { worldId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        icon: true,
        folderId: true,
        parentCardId: true,
        cardTypeId: true,
        deletedAt: true,
        cardType: {
          select: { name: true, slug: true, icon: true, color: true },
        },
      },
    });

    return { folders, cards };
  }

  async restore(worldId: string, dto: RestoreItemDto) {
    if (dto.itemType === TrashItemType.FOLDER) {
      return this.restoreFolder(worldId, dto.id);
    } else if (dto.itemType === TrashItemType.CARD) {
      return this.restoreCard(worldId, dto.id);
    }
    throw new BadRequestException('Invalid item type.');
  }

  private async restoreFolder(worldId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, worldId, deletedAt: { not: null } },
    });
    if (!folder) {
      throw new NotFoundException('Deleted folder not found in trash.');
    }

    let targetParentId = folder.parentId;
    if (targetParentId) {
      const parent = await this.prisma.folder.findFirst({
        where: { id: targetParentId, worldId, deletedAt: null },
      });
      // If parent is still deleted or missing, restore to root
      if (!parent) {
        targetParentId = null;
      }
    }

    // Find all descendant folders that were deleted
    const descendantFolders = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE folder_descendants AS (
        SELECT id
        FROM "folders"
        WHERE id = ${id} AND "worldId" = ${worldId}
        UNION ALL
        SELECT f.id
        FROM "folders" f
        INNER JOIN folder_descendants fd ON f."parentId" = fd.id
        WHERE f."worldId" = ${worldId}
      )
      SELECT id FROM folder_descendants;
    `;

    const folderIds = descendantFolders.map((f) => f.id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Restore folder itself (and re-point to root if parent was deleted)
      await tx.folder.update({
        where: { id_worldId: { id, worldId } },
        data: {
          parentId: targetParentId,
          deletedAt: null,
        },
      });

      // 2. Restore descendant folders
      if (folderIds.length > 1) {
        await tx.folder.updateMany({
          where: { id: { in: folderIds }, worldId },
          data: { deletedAt: null },
        });
      }

      // 3. Restore cards and their documents inside these folders
      const cards = await tx.card.findMany({
        where: { folderId: { in: folderIds }, worldId },
        select: { id: true, documentId: true },
      });

      if (cards.length > 0) {
        const cardIds = cards.map((c) => c.id);
        const documentIds = cards.map((c) => c.documentId);

        await tx.card.updateMany({
          where: { id: { in: cardIds }, worldId },
          data: { deletedAt: null },
        });

        await tx.document.updateMany({
          where: { id: { in: documentIds }, worldId },
          data: { deletedAt: null },
        });
      }

      return {
        success: true,
        restoredFoldersCount: folderIds.length,
        restoredCardsCount: cards.length,
      };
    });
  }

  private async restoreCard(worldId: string, id: string) {
    const card = await this.prisma.card.findFirst({
      where: { id, worldId, deletedAt: { not: null } },
    });
    if (!card) {
      throw new NotFoundException('Deleted card not found in trash.');
    }

    let targetFolderId = card.folderId;
    let targetParentCardId = card.parentCardId;

    if (targetFolderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: targetFolderId, worldId, deletedAt: null },
      });
      if (!folder) {
        targetFolderId = null;
      }
    }

    if (targetParentCardId) {
      const parentCard = await this.prisma.card.findFirst({
        where: { id: targetParentCardId, worldId, deletedAt: null },
      });
      if (!parentCard) {
        targetParentCardId = null;
      }
    }

    // Find all descendant child cards via recursive CTE
    const descendantCards = await this.prisma.$queryRaw<{ id: string; documentId: string }[]>`
      WITH RECURSIVE child_cards AS (
        SELECT id, "documentId"
        FROM "cards"
        WHERE id = ${id} AND "worldId" = ${worldId}
        UNION ALL
        SELECT c.id, c."documentId"
        FROM "cards" c
        INNER JOIN child_cards cc ON c."parentCardId" = cc.id
        WHERE c."worldId" = ${worldId}
      )
      SELECT id, "documentId" FROM child_cards;
    `;

    const cardIds = descendantCards.map((c) => c.id);
    const documentIds = descendantCards.map((c) => c.documentId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Restore the root target card with sanitized parent / folder
      await tx.card.update({
        where: { id_worldId: { id, worldId } },
        data: {
          folderId: targetFolderId,
          parentCardId: targetParentCardId,
          deletedAt: null,
        },
      });

      // 2. Restore child cards
      if (cardIds.length > 1) {
        await tx.card.updateMany({
          where: { id: { in: cardIds }, worldId },
          data: { deletedAt: null },
        });
      }

      // 3. Restore all associated documents
      await tx.document.updateMany({
        where: { id: { in: documentIds }, worldId },
        data: { deletedAt: null },
      });

      return {
        success: true,
        restoredCardsCount: cardIds.length,
      };
    });
  }
}
