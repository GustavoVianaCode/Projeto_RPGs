import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardTypeDto } from './dto/create-card-type.dto';
import { UpdateCardTypeDto } from './dto/update-card-type.dto';
import { CreatePropertyDefinitionDto } from './dto/create-property.dto';
import { UpdatePropertyDefinitionDto } from './dto/update-property.dto';
import { PropertyDefinition } from '@proj/database';

@Injectable()
export class CardTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(worldId: string, dto: CreateCardTypeDto) {
    const existing = await this.prisma.cardType.findFirst({
      where: { worldId, slug: dto.slug.toLowerCase(), deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('A card type with this slug already exists in this world.');
    }

    if (dto.parentTypeId) {
      const parent = await this.prisma.cardType.findFirst({
        where: { id: dto.parentTypeId, worldId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent card type not found in this world.');
      }
    }

    return this.prisma.cardType.create({
      data: {
        worldId,
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        parentTypeId: dto.parentTypeId || null,
        icon: dto.icon,
        color: dto.color,
        defaultBlocks: dto.defaultBlocks ?? undefined,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll(worldId: string) {
    return this.prisma.cardType.findMany({
      where: { worldId, deletedAt: null },
      include: {
        properties: {
          orderBy: { sortOrder: 'asc' },
        },
        parentType: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(worldId: string, id: string) {
    const cardType = await this.prisma.cardType.findFirst({
      where: { id, worldId, deletedAt: null },
      include: {
        properties: {
          orderBy: { sortOrder: 'asc' },
        },
        parentType: {
          select: { id: true, name: true, slug: true, parentTypeId: true },
        },
      },
    });

    if (!cardType) {
      throw new NotFoundException('Card type not found.');
    }

    // Resolve inherited properties recursively
    const inheritedProperties: PropertyDefinition[] = [];
    let currentParentId = cardType.parentTypeId;

    while (currentParentId) {
      const parentProps = await this.prisma.propertyDefinition.findMany({
        where: { cardTypeId: currentParentId, worldId },
        orderBy: { sortOrder: 'asc' },
      });

      inheritedProperties.unshift(...parentProps);

      const parentType: { parentTypeId: string | null } | null = await this.prisma.cardType.findUnique({
        where: { id_worldId: { id: currentParentId, worldId } },
        select: { parentTypeId: true },
      });

      currentParentId = parentType?.parentTypeId || null;
    }

    // Combine all properties, own properties taking precedence if slugs ever collide
    const propertyMap = new Map<string, PropertyDefinition>();
    for (const prop of inheritedProperties) {
      propertyMap.set(prop.slug, prop);
    }
    for (const prop of cardType.properties) {
      propertyMap.set(prop.slug, prop);
    }

    return {
      ...cardType,
      inheritedProperties,
      allProperties: Array.from(propertyMap.values()),
    };
  }

  async update(worldId: string, id: string, dto: UpdateCardTypeDto) {
    const cardType = await this.prisma.cardType.findFirst({
      where: { id, worldId, deletedAt: null },
    });
    if (!cardType) {
      throw new NotFoundException('Card type not found.');
    }

    if (dto.parentTypeId !== undefined && dto.parentTypeId !== null) {
      if (dto.parentTypeId === id) {
        throw new BadRequestException('A card type cannot be a parent of itself.');
      }

      const targetParent = await this.prisma.cardType.findFirst({
        where: { id: dto.parentTypeId, worldId, deletedAt: null },
      });
      if (!targetParent) {
        throw new NotFoundException('Target parent card type not found in this world.');
      }

      // Check cycles: ensure id is not an ancestor of dto.parentTypeId
      let cursor: string | null = targetParent.parentTypeId;
      while (cursor) {
        if (cursor === id) {
          throw new BadRequestException('Cannot set parent: cycle detected in type hierarchy.');
        }
        const ancestor: { parentTypeId: string | null } | null = await this.prisma.cardType.findUnique({
          where: { id_worldId: { id: cursor, worldId } },
          select: { parentTypeId: true },
        });
        cursor = ancestor?.parentTypeId || null;
      }
    }

    return this.prisma.cardType.update({
      where: { id_worldId: { id, worldId } },
      data: dto,
    });
  }

  async softDelete(worldId: string, id: string) {
    const cardType = await this.prisma.cardType.findFirst({
      where: { id, worldId, deletedAt: null },
    });
    if (!cardType) {
      throw new NotFoundException('Card type not found.');
    }

    return this.prisma.cardType.update({
      where: { id_worldId: { id, worldId } },
      data: { deletedAt: new Date() },
    });
  }

  // --------------------------------------------------------------------------
  // Property Definitions CRUD
  // --------------------------------------------------------------------------

  async createProperty(worldId: string, cardTypeId: string, dto: CreatePropertyDefinitionDto) {
    const cardType = await this.prisma.cardType.findFirst({
      where: { id: cardTypeId, worldId, deletedAt: null },
    });
    if (!cardType) {
      throw new NotFoundException('Card type not found.');
    }

    const existing = await this.prisma.propertyDefinition.findFirst({
      where: { cardTypeId, slug: dto.slug.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A property with this slug already exists for this card type.');
    }

    return this.prisma.propertyDefinition.create({
      data: {
        worldId,
        cardTypeId,
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        type: dto.type,
        options: dto.options ?? undefined,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAllProperties(worldId: string, cardTypeId: string) {
    const cardType = await this.prisma.cardType.findFirst({
      where: { id: cardTypeId, worldId, deletedAt: null },
    });
    if (!cardType) {
      throw new NotFoundException('Card type not found.');
    }

    return this.prisma.propertyDefinition.findMany({
      where: { cardTypeId, worldId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateProperty(
    worldId: string,
    cardTypeId: string,
    propertyId: string,
    dto: UpdatePropertyDefinitionDto,
  ) {
    const property = await this.prisma.propertyDefinition.findFirst({
      where: { id: propertyId, cardTypeId, worldId },
    });
    if (!property) {
      throw new NotFoundException('Property definition not found.');
    }

    return this.prisma.propertyDefinition.update({
      where: { id_worldId: { id: propertyId, worldId } },
      data: dto,
    });
  }

  async deleteProperty(worldId: string, cardTypeId: string, propertyId: string) {
    const property = await this.prisma.propertyDefinition.findFirst({
      where: { id: propertyId, cardTypeId, worldId },
    });
    if (!property) {
      throw new NotFoundException('Property definition not found.');
    }

    await this.prisma.propertyDefinition.delete({
      where: { id_worldId: { id: propertyId, worldId } },
    });

    return { success: true };
  }
}
