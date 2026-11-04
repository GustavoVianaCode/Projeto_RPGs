import { Test, TestingModule } from '@nestjs/testing';
import { VersionsService } from './versions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('VersionsService', () => {
  let service: VersionsService;

  type MockPrismaType = {
    card: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    document: {
      update: jest.Mock;
    };
    documentVersion: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockPrisma: MockPrismaType = {
    card: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    document: {
      update: jest.fn(),
    },
    documentVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: MockPrismaType) => unknown) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
    jest.clearAllMocks();
  });

  describe('createCheckpoint', () => {
    it('should create a new version checkpoint with incremented versionNumber', async () => {
      mockPrisma.card.findFirst.mockResolvedValue({
        id: 'card-1',
        worldId: 'world-1',
        title: 'Cidade de Valen',
        document: {
          id: 'doc-1',
          contentJson: { type: 'doc', content: [] },
          plainText: 'Texto descritivo de Valen',
        },
      });

      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        versionNumber: 2,
      });

      const now = new Date();
      mockPrisma.documentVersion.create.mockResolvedValue({
        id: 'v-3',
        worldId: 'world-1',
        cardId: 'card-1',
        documentId: 'doc-1',
        versionNumber: 3,
        titleSnapshot: 'Cidade de Valen',
        label: 'Antes do cerco',
        createdAt: now,
      });

      const result = await service.createCheckpoint(
        'world-1',
        'card-1',
        { label: 'Antes do cerco' },
        'user-1',
      );

      expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith({
        data: {
          worldId: 'world-1',
          cardId: 'card-1',
          documentId: 'doc-1',
          versionNumber: 3,
          titleSnapshot: 'Cidade de Valen',
          contentJson: { type: 'doc', content: [] },
          plainText: 'Texto descritivo de Valen',
          label: 'Antes do cerco',
          createdById: 'user-1',
        },
      });
      expect(result.versionNumber).toBe(3);
    });

    it('should throw NotFoundException if card is not found in world', async () => {
      mockPrisma.card.findFirst.mockResolvedValue(null);

      await expect(
        service.createCheckpoint('world-1', 'foreign-card', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('restoreVersion', () => {
    it('should create a safety backup before restoring and update document', async () => {
      mockPrisma.documentVersion.findFirst
        .mockResolvedValueOnce({
          id: 'v-1',
          worldId: 'world-1',
          cardId: 'card-1',
          versionNumber: 1,
          titleSnapshot: 'Versão Original',
          contentJson: { type: 'doc', content: [] },
          plainText: 'Texto antigo',
        })
        .mockResolvedValueOnce({
          versionNumber: 3,
        });

      mockPrisma.card.findFirst.mockResolvedValue({
        id: 'card-1',
        worldId: 'world-1',
        title: 'Versão Modificada',
        document: {
          id: 'doc-1',
          contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
          plainText: 'Texto modificado atual',
        },
      });

      const result = await service.restoreVersion(
        'world-1',
        'card-1',
        'v-1',
        'user-1',
      );

      // Verify safety backup was created (version 4)
      expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          worldId: 'world-1',
          cardId: 'card-1',
          versionNumber: 4,
          label: expect.stringContaining('Backup automático antes de restaurar v1'),
        }),
      });

      // Verify document was reverted
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id_worldId: { id: 'doc-1', worldId: 'world-1' } },
        data: {
          contentJson: { type: 'doc', content: [] },
          plainText: 'Texto antigo',
          yjsState: null,
        },
      });

      // Verify card title was updated
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id_worldId: { id: 'card-1', worldId: 'world-1' } },
        data: { title: 'Versão Original' },
      });

      expect(result.success).toBe(true);
      expect(result.restoredVersionNumber).toBe(1);
    });

    it('should throw NotFoundException if version does not match worldId (Anti-IDOR)', async () => {
      mockPrisma.documentVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.restoreVersion('world-1', 'card-1', 'foreign-v-9'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
