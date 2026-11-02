import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';

export interface FolderTreeNode {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: FolderTreeNode[];
}

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(worldId: string, dto: CreateFolderDto) {
    if (dto.parentId) {
      const parent = await this.prisma.folder.findFirst({
        where: { id: dto.parentId, worldId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found in this world.');
      }
    }

    return this.prisma.folder.create({
      data: {
        worldId,
        name: dto.name,
        parentId: dto.parentId || null,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll(worldId: string) {
    return this.prisma.folder.findMany({
      where: { worldId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findTree(worldId: string): Promise<FolderTreeNode[]> {
    const folders = await this.prisma.folder.findMany({
      where: { worldId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    for (const folder of folders) {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        icon: folder.icon,
        color: folder.color,
        sortOrder: folder.sortOrder,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        children: [],
      });
    }

    for (const folder of folders) {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children.push(node);
      } else {
        rootFolders.push(node);
      }
    }

    return rootFolders;
  }

  async findOne(worldId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, worldId, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        cards: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            cardTypeId: true,
            icon: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found.');
    }

    return folder;
  }

  async update(worldId: string, id: string, dto: UpdateFolderDto) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, worldId, deletedAt: null },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found.');
    }

    return this.prisma.folder.update({
      where: { id_worldId: { id, worldId } },
      data: dto,
    });
  }

  async move(worldId: string, id: string, dto: MoveFolderDto) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, worldId, deletedAt: null },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found.');
    }

    const newParentId = dto.newParentId === undefined ? folder.parentId : dto.newParentId;

    if (newParentId) {
      if (newParentId === id) {
        throw new BadRequestException('A folder cannot be a parent of itself.');
      }

      const targetParent = await this.prisma.folder.findFirst({
        where: { id: newParentId, worldId, deletedAt: null },
      });
      if (!targetParent) {
        throw new NotFoundException('Target parent folder not found in this world.');
      }

      // Recursive CTE to check if newParentId is a descendant of id
      const cycleCheck = await this.prisma.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE folder_ancestors AS (
          SELECT id, "parentId"
          FROM "folders"
          WHERE id = ${newParentId} AND "worldId" = ${worldId}
          UNION ALL
          SELECT f.id, f."parentId"
          FROM "folders" f
          INNER JOIN folder_ancestors fa ON f.id = fa."parentId"
          WHERE f."worldId" = ${worldId}
        )
        SELECT id FROM folder_ancestors WHERE id = ${id} LIMIT 1;
      `;

      if (cycleCheck.length > 0) {
        throw new BadRequestException('Cannot move a folder into one of its descendants.');
      }
    }

    return this.prisma.folder.update({
      where: { id_worldId: { id, worldId } },
      data: {
        parentId: newParentId,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : folder.sortOrder,
      },
    });
  }

  async softDelete(worldId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, worldId, deletedAt: null },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found.');
    }

    const now = new Date();

    // Find all descendant folders via recursive CTE
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
      // 1. Soft-delete folders
      await tx.folder.updateMany({
        where: { id: { in: folderIds }, worldId },
        data: { deletedAt: now },
      });

      // 2. Find cards in these folders
      const cards = await tx.card.findMany({
        where: { folderId: { in: folderIds }, worldId, deletedAt: null },
        select: { id: true, documentId: true },
      });

      if (cards.length > 0) {
        const cardIds = cards.map((c) => c.id);
        const documentIds = cards.map((c) => c.documentId);

        // 3. Soft-delete cards
        await tx.card.updateMany({
          where: { id: { in: cardIds }, worldId },
          data: { deletedAt: now },
        });

        // 4. Soft-delete documents
        await tx.document.updateMany({
          where: { id: { in: documentIds }, worldId },
          data: { deletedAt: now },
        });
      }

      return {
        success: true,
        deletedFoldersCount: folderIds.length,
        deletedCardsCount: cards.length,
      };
    });
  }
}
