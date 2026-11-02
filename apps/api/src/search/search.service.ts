import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@proj/database';

export interface SearchResult {
  id: string;
  title: string;
  summary: string | null;
  icon: string | null;
  slug: string;
  cardTypeId: string;
  folderId: string | null;
  parentCardId: string | null;
  documentId: string;
  rank: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(worldId: string, q: string): Promise<SearchResult[]> {
    if (!q || q.trim().length < 2) {
      return [];
    }

    const trimmed = q.trim();

    const results = await this.prisma.$queryRaw<SearchResult[]>(Prisma.sql`
      SELECT
        c.id,
        c.title,
        c.summary,
        c.icon,
        c.slug,
        c."cardTypeId",
        c."folderId",
        c."parentCardId",
        c."documentId",
        (
          ts_rank(
            (
              setweight(to_tsvector('portuguese', coalesce(c.title, '')), 'A') ||
              setweight(to_tsvector('portuguese', coalesce(array_to_string(c.aliases, ' '), '')), 'B') ||
              setweight(to_tsvector('portuguese', coalesce(c.summary, '')), 'C') ||
              setweight(to_tsvector('portuguese', coalesce(d."plainText", '')), 'D')
            ),
            plainto_tsquery('portuguese', ${trimmed})
          ) * 2.0
          +
          greatest(
            similarity(c.title, ${trimmed}),
            similarity(coalesce(c.summary, ''), ${trimmed})
          )
        ) AS rank
      FROM cards c
      JOIN documents d ON d.id = c."documentId" AND d."worldId" = ${worldId} AND d."deletedAt" IS NULL
      WHERE
        c."worldId" = ${worldId}
        AND c."deletedAt" IS NULL
        AND (
          (
            setweight(to_tsvector('portuguese', coalesce(c.title, '')), 'A') ||
            setweight(to_tsvector('portuguese', coalesce(array_to_string(c.aliases, ' '), '')), 'B') ||
            setweight(to_tsvector('portuguese', coalesce(c.summary, '')), 'C') ||
            setweight(to_tsvector('portuguese', coalesce(d."plainText", '')), 'D')
          ) @@ plainto_tsquery('portuguese', ${trimmed})
          OR similarity(c.title, ${trimmed}) > 0.15
          OR similarity(coalesce(c.summary, ''), ${trimmed}) > 0.1
        )
      ORDER BY rank DESC
      LIMIT 20
    `);

    return results;
  }
}

