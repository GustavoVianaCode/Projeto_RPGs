import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorldDto } from './dto/create-world.dto';
import { UpdateWorldDto } from './dto/update-world.dto';
import { WorldRole } from '@proj/database';

@Injectable()
export class WorldsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorldDto) {
    const existing = await this.prisma.world.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A world with this slug already exists.');
    }

    return this.prisma.$transaction(async (tx) => {
      const world = await tx.world.create({
        data: {
          name: dto.name,
          slug: dto.slug.toLowerCase(),
          description: dto.description,
        },
      });

      await tx.worldMember.create({
        data: {
          worldId: world.id,
          userId,
          role: WorldRole.OWNER,
        },
      });

      return world;
    });
  }

  async findAllUserWorlds(userId: string) {
    return this.prisma.world.findMany({
      where: {
        deletedAt: null,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, worldId: string) {
    const world = await this.prisma.world.findFirst({
      where: {
        id: worldId,
        deletedAt: null,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!world) {
      throw new NotFoundException('World not found or insufficient access.');
    }

    return world;
  }

  async update(worldId: string, dto: UpdateWorldDto) {
    return this.prisma.world.update({
      where: { id: worldId },
      data: dto,
    });
  }

  async softDelete(worldId: string) {
    return this.prisma.world.update({
      where: { id: worldId },
      data: { deletedAt: new Date() },
    });
  }
}
