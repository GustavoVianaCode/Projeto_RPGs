import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto, PropertyValueInputDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { FilterCardsDto } from './dto/filter-cards.dto';
import { PropertyDefinition, PropertyType } from '@proj/database';

function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'card';
}

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActivePropertyDefinitionsForType(
    worldId: string,
    cardTypeId: string,
  ): Promise<PropertyDefinition[]> {
    const cardType = await this.prisma.cardType.findFirst({
      where: { id: cardTypeId, worldId, deletedAt: null },
    });
    if (!cardType) {
      throw new NotFoundException('Card type not found in this world.');
    }

    const properties: PropertyDefinition[] = [];
    let currentTypeId: string | null = cardTypeId;

    while (currentTypeId) {
      const typeProps = await this.prisma.propertyDefinition.findMany({
        where: { cardTypeId: currentTypeId, worldId },
        orderBy: { sortOrder: 'asc' },
      });
      properties.unshift(...typeProps);

      const typeInfo: { parentTypeId: string | null } | null = await this.prisma.cardType.findUnique({
        where: { id_worldId: { id: currentTypeId, worldId } },
        select: { parentTypeId: true },
      });
      currentTypeId = typeInfo?.parentTypeId || null;
    }

    // Deduplicate by slug (own properties win)
    const map = new Map<string, PropertyDefinition>();
    for (const p of properties) {
      map.set(p.slug, p);
    }
    return Array.from(map.values());
  }

  private async generateUniqueSlug(worldId: string, baseTitle: string, customSlug?: string): Promise<string> {
    const baseSlug = customSlug ? toSlug(customSlug) : toSlug(baseTitle);
    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.card.findFirst({
        where: { worldId, slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      candidate = `${baseSlug}-${counter++}`;
    }
  }

  async create(worldId: string, dto: CreateCardDto) {
    // 1. Constraint check: folderId vs parentCardId exclusivity
    if (dto.folderId && dto.parentCardId) {
      throw new BadRequestException('A card cannot belong to a folder and a parent card simultaneously.');
    }

    // 2. Validate folder if provided
    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, worldId, deletedAt: null },
      });
      if (!folder) {
        throw new NotFoundException('Folder not found in this world.');
      }
    }

    // 3. Validate parentCard if provided
    if (dto.parentCardId) {
      const parentCard = await this.prisma.card.findFirst({
        where: { id: dto.parentCardId, worldId, deletedAt: null },
      });
      if (!parentCard) {
        throw new NotFoundException('Parent card not found in this world.');
      }
    }

    // 4. Validate card type and load valid properties
    const validProperties = await this.getActivePropertyDefinitionsForType(worldId, dto.cardTypeId);
    const validPropsById = new Map(validProperties.map((p) => [p.id, p]));

    // 5. Validate required properties and property values
    const inputValues = dto.propertyValues || [];
    const inputPropIds = new Set(inputValues.map((v) => v.propertyId));

    for (const prop of validProperties) {
      if (prop.isRequired && !inputPropIds.has(prop.id)) {
        throw new BadRequestException(`Required property "${prop.name}" is missing.`);
      }
    }

    for (const val of inputValues) {
      const propDef = validPropsById.get(val.propertyId);
      if (!propDef) {
        throw new BadRequestException(`Property with ID "${val.propertyId}" does not belong to this card type.`);
      }

      if (propDef.type === PropertyType.CARD_REFERENCE) {
        const targetId = val.targetCardId || (typeof val.value === 'string' ? val.value : null);
        if (targetId) {
          const targetCard = await this.prisma.card.findFirst({
            where: { id: targetId, worldId, deletedAt: null },
          });
          if (!targetCard) {
            throw new BadRequestException(
              `Referenced target card "${targetId}" not found or does not belong to this world.`,
            );
          }
          val.targetCardId = targetId;
        }
      }
    }

    // 6. Generate unique slug
    const slug = await this.generateUniqueSlug(worldId, dto.title, dto.slug);

    // 7. Atomic transaction: create Document + Card + PropertyValues
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          worldId,
          contentJson: {},
          plainText: '',
        },
      });

      const card = await tx.card.create({
        data: {
          worldId,
          cardTypeId: dto.cardTypeId,
          folderId: dto.folderId || null,
          parentCardId: dto.parentCardId || null,
          documentId: document.id,
          title: dto.title,
          slug,
          aliases: dto.aliases || [],
          summary: dto.summary,
          coverUrl: dto.coverUrl,
          icon: dto.icon,
          isPublished: dto.isPublished ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
      });

      if (inputValues.length > 0) {
        await tx.cardPropertyValue.createMany({
          data: inputValues.map((v) => ({
            worldId,
            cardId: card.id,
            propertyId: v.propertyId,
            value: v.value,
            targetCardId: v.targetCardId || null,
          })),
        });
      }

      return tx.card.findUnique({
        where: { id_worldId: { id: card.id, worldId } },
        include: {
          document: true,
          cardType: true,
          properties: {
            include: { property: true },
          },
        },
      });
    });
  }

  async findAll(worldId: string, filters: FilterCardsDto) {
    const where: any = { worldId, deletedAt: null };

    if (filters.folderId !== undefined) {
      where.folderId = filters.folderId;
    }
    if (filters.cardTypeId) {
      where.cardTypeId = filters.cardTypeId;
    }
    if (filters.parentCardId !== undefined) {
      where.parentCardId = filters.parentCardId;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
        { aliases: { has: filters.search } },
      ];
    }

    return this.prisma.card.findMany({
      where,
      include: {
        cardType: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
        folder: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  async findOne(worldId: string, id: string) {
    const card = await this.prisma.card.findFirst({
      where: { id, worldId, deletedAt: null },
      include: {
        document: true,
        cardType: true,
        folder: true,
        parentCard: {
          select: { id: true, title: true, slug: true },
        },
        childCards: {
          where: { deletedAt: null },
          select: { id: true, title: true, slug: true, icon: true, sortOrder: true },
        },
        properties: {
          include: { property: true },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found.');
    }

    return card;
  }

  async update(worldId: string, id: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findFirst({
      where: { id, worldId, deletedAt: null },
    });
    if (!card) {
      throw new NotFoundException('Card not found.');
    }

    const newFolderId = dto.folderId !== undefined ? dto.folderId : card.folderId;
    const newParentCardId = dto.parentCardId !== undefined ? dto.parentCardId : card.parentCardId;

    if (newFolderId && newParentCardId) {
      throw new BadRequestException('A card cannot belong to a folder and a parent card simultaneously.');
    }

    if (newFolderId && newFolderId !== card.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: newFolderId, worldId, deletedAt: null },
      });
      if (!folder) {
        throw new NotFoundException('Target folder not found in this world.');
      }
    }

    if (newParentCardId && newParentCardId !== card.parentCardId) {
      if (newParentCardId === id) {
        throw new BadRequestException('A card cannot be a parent of itself.');
      }

      const targetParent = await this.prisma.card.findFirst({
        where: { id: newParentCardId, worldId, deletedAt: null },
      });
      if (!targetParent) {
        throw new NotFoundException('Target parent card not found in this world.');
      }

      // Check cycles via recursive CTE
      const cycleCheck = await this.prisma.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE card_ancestors AS (
          SELECT id, "parentCardId"
          FROM "cards"
          WHERE id = ${newParentCardId} AND "worldId" = ${worldId}
          UNION ALL
          SELECT c.id, c."parentCardId"
          FROM "cards" c
          INNER JOIN card_ancestors ca ON c.id = ca."parentCardId"
          WHERE c."worldId" = ${worldId}
        )
        SELECT id FROM card_ancestors WHERE id = ${id} LIMIT 1;
      `;

      if (cycleCheck.length > 0) {
        throw new BadRequestException('Cannot move a card into one of its child descendants.');
      }
    }

    // If title or custom slug is updated, generate slug
    let updatedSlug = card.slug;
    if (dto.slug && dto.slug !== card.slug) {
      updatedSlug = await this.generateUniqueSlug(worldId, card.title, dto.slug);
    } else if (dto.title && dto.title !== card.title && !dto.slug) {
      updatedSlug = await this.generateUniqueSlug(worldId, dto.title);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.card.update({
        where: { id_worldId: { id, worldId } },
        data: {
          title: dto.title,
          slug: updatedSlug,
          cardTypeId: dto.cardTypeId,
          folderId: newFolderId,
          parentCardId: newParentCardId,
          aliases: dto.aliases,
          summary: dto.summary,
          coverUrl: dto.coverUrl,
          icon: dto.icon,
          isPublished: dto.isPublished,
          sortOrder: dto.sortOrder,
        },
      });

      if (dto.propertyValues) {
        // Upsert property values
        for (const pv of dto.propertyValues) {
          await tx.cardPropertyValue.upsert({
            where: {
              cardId_propertyId: { cardId: id, propertyId: pv.propertyId },
            },
            create: {
              worldId,
              cardId: id,
              propertyId: pv.propertyId,
              value: pv.value,
              targetCardId: pv.targetCardId || null,
            },
            update: {
              value: pv.value,
              targetCardId: pv.targetCardId || null,
            },
          });
        }
      }

      return tx.card.findUnique({
        where: { id_worldId: { id, worldId } },
        include: {
          document: true,
          cardType: true,
          properties: { include: { property: true } },
        },
      });
    });
  }

  async softDelete(worldId: string, id: string) {
    const card = await this.prisma.card.findFirst({
      where: { id, worldId, deletedAt: null },
    });
    if (!card) {
      throw new NotFoundException('Card not found.');
    }

    const now = new Date();

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
      await tx.card.updateMany({
        where: { id: { in: cardIds }, worldId },
        data: { deletedAt: now },
      });

      await tx.document.updateMany({
        where: { id: { in: documentIds }, worldId },
        data: { deletedAt: now },
      });

      return {
        success: true,
        deletedCardsCount: cardIds.length,
      };
    });
  }
}
