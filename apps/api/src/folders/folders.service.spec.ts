import { Test, TestingModule } from '@nestjs/testing';
import { FoldersService } from './folders.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('FoldersService', () => {
  let service: FoldersService;

  const mockPrisma = {
    folder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FoldersService>(FoldersService);
    jest.clearAllMocks();
  });

  it('should build a nested tree from flat list', async () => {
    const now = new Date();
    mockPrisma.folder.findMany.mockResolvedValue([
      { id: '1', name: 'Root', parentId: null, sortOrder: 0, icon: null, color: null, createdAt: now, updatedAt: now },
      { id: '2', name: 'Child', parentId: '1', sortOrder: 0, icon: null, color: null, createdAt: now, updatedAt: now },
      { id: '3', name: 'Grandchild', parentId: '2', sortOrder: 0, icon: null, color: null, createdAt: now, updatedAt: now },
    ]);

    const tree = await service.findTree('world-1');

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('2');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe('3');
  });

  it('should reject moving a folder into itself with BadRequestException', async () => {
    mockPrisma.folder.findFirst.mockResolvedValue({ id: 'f-1', worldId: 'w-1', parentId: null });

    await expect(
      service.move('w-1', 'f-1', { newParentId: 'f-1' }),
    ).rejects.toThrow(BadRequestException);
  });
});
