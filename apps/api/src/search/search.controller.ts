import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MinWorldRole, WorldRoleGuard } from '../worlds/guards/world-role.guard';
import { WorldRole } from '@proj/database';

@Controller('worlds/:worldId/search')
@UseGuards(JwtAuthGuard, WorldRoleGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @MinWorldRole(WorldRole.VIEWER)
  async search(
    @Param('worldId') worldId: string,
    @Query('q') q: string,
  ) {
    if (!q || q.trim().length < 2) {
      return [];
    }
    return this.searchService.search(worldId, q);
  }
}

