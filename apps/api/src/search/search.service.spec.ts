import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: { $queryRaw: jest.Mock };

  const mockResults = [
    {
      id: 'card-1',
      title: 'Aragorn',
      summary: 'Ranger do Norte',
      icon: '⚔️',
      slug: 'aragorn',
      cardTypeId: 'type-1',
      folderId: null,
      parentCardId: null,
      documentId: 'doc-1',
      rank: 1.5,
    },
    {
      id: 'card-2',
      title: 'Arwen',
      summary: 'Elfa imortal',
      icon: '🌟',
      slug: 'arwen',
      cardTypeId: 'type-1',
      folderId: 'folder-1',
      parentCardId: null,
      documentId: 'doc-2',
      rank: 0.8,
    },
  ];

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns [] when q is empty string', async () => {
    const result = await service.search('world-1', '');
    expect(result).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns [] when q has less than 2 chars', async () => {
    const result = await service.search('world-1', 'a');
    expect(result).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('calls $queryRaw when q has 2+ chars', async () => {
    prisma.$queryRaw.mockResolvedValue(mockResults);

    const result = await service.search('world-1', 'ar');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it('passes worldId correctly to the query', async () => {
    prisma.$queryRaw.mockResolvedValue(mockResults);

    await service.search('world-xyz', 'aragorn');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    // The query template includes worldId — just verify it was called
    const callArg = prisma.$queryRaw.mock.calls[0][0];
    // Prisma.sql returns a tagged template object with values array
    const values: unknown[] = (callArg as { values: unknown[] }).values;
    expect(values).toContain('world-xyz');
  });

  it('returns results ordered by rank DESC', async () => {
    // mock returns already sorted; verify the service preserves order
    prisma.$queryRaw.mockResolvedValue(mockResults);

    const result = await service.search('world-1', 'aragorn');
    expect(result[0].rank).toBeGreaterThanOrEqual(result[1].rank);
  });

  it('trims whitespace from query before searching', async () => {
    prisma.$queryRaw.mockResolvedValue(mockResults);

    await service.search('world-1', '  aragorn  ');
    const callArg = prisma.$queryRaw.mock.calls[0][0];
    const values: unknown[] = (callArg as { values: unknown[] }).values;
    // trimmed value should be 'aragorn', not '  aragorn  '
    expect(values).toContain('aragorn');
  });

  it('passes trimmed query multiple times (ts_rank + similarity calls)', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await service.search('world-1', 'gandalf');
    const callArg = prisma.$queryRaw.mock.calls[0][0];
    const values: unknown[] = (callArg as { values: unknown[] }).values;

    // The SQL uses ${trimmed} in multiple places (plainto_tsquery x2, similarity x2)
    // so 'gandalf' must appear at least twice in the values array
    const occurrences = values.filter((v) => v === 'gandalf').length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('always includes worldId in query values for multi-tenancy isolation', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    const targetWorld = 'world-tenancy-check';
    await service.search(targetWorld, 'dragon');
    const callArg = prisma.$queryRaw.mock.calls[0][0];
    const values: unknown[] = (callArg as { values: unknown[] }).values;

    // worldId must appear to ensure the SQL WHERE clause filters by world
    expect(values).toContain(targetWorld);
  });

  it('assembles raw SQL query with weighted tsvector (A, B, C, D), similarity, and soft-delete filters', async () => {
    prisma.$queryRaw.mockResolvedValue(mockResults);

    await service.search('world-42', 'mordor');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);

    const callArg = prisma.$queryRaw.mock.calls[0][0];
    const sqlText = (callArg as { strings: string[] }).strings.join('?');

    // Verify weights A, B, C, D
    expect(sqlText).toContain("setweight(to_tsvector('portuguese', coalesce(c.title, '')), 'A')");
    expect(sqlText).toContain("setweight(to_tsvector('portuguese', coalesce(array_to_string(c.aliases, ' '), '')), 'B')");
    expect(sqlText).toContain("setweight(to_tsvector('portuguese', coalesce(c.summary, '')), 'C')");
    expect(sqlText).toContain("setweight(to_tsvector('portuguese', coalesce(d.\"plainText\", '')), 'D')");

    // Verify full-text and trigram functions
    expect(sqlText).toContain('ts_rank');
    expect(sqlText).toContain('plainto_tsquery');
    expect(sqlText).toContain('similarity');

    // Verify multi-tenancy and soft delete filters
    expect(sqlText).toContain('c."deletedAt" IS NULL');
    expect(sqlText).toContain('d."deletedAt" IS NULL');
  });

  it('returns empty array without calling DB when query has only whitespace', async () => {
    const result = await service.search('world-1', '   ');
    expect(result).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

