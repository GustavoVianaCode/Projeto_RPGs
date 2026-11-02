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
});
