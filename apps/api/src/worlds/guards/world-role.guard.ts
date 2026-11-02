import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { WorldRole } from '@proj/database';

export const MIN_ROLE_KEY = 'min_world_role';
export const MinWorldRole = (role: WorldRole) => SetMetadata(MIN_ROLE_KEY, role);

const ROLE_WEIGHT: Record<WorldRole, number> = {
  OWNER: 40,
  ADMIN: 30,
  EDITOR: 20,
  VIEWER: 10,
};

@Injectable()
export class WorldRoleGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<WorldRole>(
      MIN_ROLE_KEY,
      context.getHandler(),
    );
    if (!requiredRole) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const worldId = request.params.id;

    if (!userId || !worldId) {
      throw new ForbiddenException('Access denied: missing context parameters.');
    }

    const membership = await this.prisma.worldMember.findUnique({
      where: {
        worldId_userId: { worldId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this world.');
    }

    if (ROLE_WEIGHT[membership.role] < ROLE_WEIGHT[requiredRole]) {
      throw new ForbiddenException('Insufficient permissions for this operation.');
    }

    request.worldMembership = membership;
    return true;
  }
}
