import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { Prisma } from '@proj/database';

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCheckpoint(
    worldId: string,
    cardId: string,
    dto: CreateVersionDto,
    userId?: string,
  ) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, worldId, deletedAt: null },
      include: { document: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found in this world.');
    }

    if (!card.document) {
      throw new BadRequestException('Card has no associated document to snapshot.');
    }

    // Determine next version number
    const lastVersion = await this.prisma.documentVersion.findFirst({
      where: { cardId, worldId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const version = await this.prisma.documentVersion.create({
      data: {
        worldId,
        cardId,
        documentId: card.document.id,
        versionNumber: nextVersionNumber,
        titleSnapshot: card.title,
        contentJson: (card.document.contentJson as Prisma.InputJsonValue) ?? {},
        plainText: card.document.plainText || '',
        label: dto.label || `Revisão #${nextVersionNumber}`,
        createdById: userId || null,
      },
    });

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      label: version.label,
      titleSnapshot: version.titleSnapshot,
      createdAt: version.createdAt,
    };
  }

  async listVersions(worldId: string, cardId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, worldId, deletedAt: null },
      select: { id: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found in this world.');
    }

    const versions = await this.prisma.documentVersion.findMany({
      where: { cardId, worldId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        titleSnapshot: true,
        plainText: true,
        createdAt: true,
        createdById: true,
      },
    });

    return versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      label: v.label,
      titleSnapshot: v.titleSnapshot,
      preview: v.plainText.slice(0, 150),
      wordCount: v.plainText.trim() ? v.plainText.trim().split(/\s+/).length : 0,
      createdAt: v.createdAt,
      createdById: v.createdById,
    }));
  }

  async getVersion(worldId: string, cardId: string, versionId: string) {
    const version = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, cardId, worldId },
    });

    if (!version) {
      throw new NotFoundException('Version not found for this card in this world.');
    }

    return version;
  }

  async restoreVersion(
    worldId: string,
    cardId: string,
    versionId: string,
    userId?: string,
  ) {
    const versionToRestore = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, cardId, worldId },
    });

    if (!versionToRestore) {
      throw new NotFoundException('Version not found for this card in this world.');
    }

    const card = await this.prisma.card.findFirst({
      where: { id: cardId, worldId, deletedAt: null },
      include: { document: true },
    });

    if (!card || !card.document) {
      throw new NotFoundException('Active card or document not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Take safety snapshot of current document state before reverting
      const lastVersion = await tx.documentVersion.findFirst({
        where: { cardId, worldId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const safetyVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      await tx.documentVersion.create({
        data: {
          worldId,
          cardId,
          documentId: card.document.id,
          versionNumber: safetyVersionNumber,
          titleSnapshot: card.title,
          contentJson: (card.document.contentJson as Prisma.InputJsonValue) ?? {},
          plainText: card.document.plainText || '',
          label: `Backup automático antes de restaurar v${versionToRestore.versionNumber}`,
          createdById: userId || null,
        },
      });

      // 2. Revert document content and plainText
      await tx.document.update({
        where: { id_worldId: { id: card.document.id, worldId } },
        data: {
          contentJson: versionToRestore.contentJson as Prisma.InputJsonValue,
          plainText: versionToRestore.plainText,
          // Clear yjs binary cache so on next connection it loads from restored contentJson
          yjsState: null,
        },
      });

      // 3. Revert card title if it was altered
      if (card.title !== versionToRestore.titleSnapshot) {
        await tx.card.update({
          where: { id_worldId: { id: card.id, worldId } },
          data: { title: versionToRestore.titleSnapshot },
        });
      }

      return {
        success: true,
        restoredVersionNumber: versionToRestore.versionNumber,
        safetyBackupVersionNumber: safetyVersionNumber,
        title: versionToRestore.titleSnapshot,
      };
    });
  }
}

