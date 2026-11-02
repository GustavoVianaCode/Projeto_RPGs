import { Test, TestingModule } from '@nestjs/testing';
import { HocuspocusService } from './hocuspocus.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as Y from 'yjs';
import { onAuthenticatePayload, onLoadDocumentPayload, onStoreDocumentPayload } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';

describe('HocuspocusService', () => {
  let service: HocuspocusService;
  let prisma: {
    user: { findUnique: jest.Mock };
    worldMember: { findUnique: jest.Mock };
    document: { findFirst: jest.Mock; updateMany: jest.Mock };
    card: { findFirst: jest.Mock };
  };
  let jwtService: { verifyAsync: jest.Mock };
  let mentionsQueue: { add: jest.Mock };

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';

    prisma = {
      user: { findUnique: jest.fn() },
      worldMember: { findUnique: jest.fn() },
      document: { findFirst: jest.fn(), updateMany: jest.fn() },
      card: { findFirst: jest.fn() },
    };

    jwtService = {
      verifyAsync: jest.fn(),
    };

    mentionsQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HocuspocusService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: 'BullQueue_mentions-queue', useValue: mentionsQueue },
      ],
    }).compile();

    service = module.get<HocuspocusService>(HocuspocusService);
  });

  describe('handleAuthenticate', () => {
    it('should throw if token is missing', async () => {
      const data = {
        token: '',
        requestParameters: new URLSearchParams(),
        requestHeaders: new Headers(),
        documentName: 'doc-1',
        connectionConfig: {},
      } as unknown as onAuthenticatePayload;

      await expect(service.handleAuthenticate(data)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user is not in world', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'User' });
      prisma.worldMember.findUnique.mockResolvedValue(null);

      const params = new URLSearchParams();
      params.set('worldId', 'world-1');

      const data = {
        token: 'valid-token',
        requestParameters: params,
        requestHeaders: new Headers(),
        documentName: 'doc-1',
        connectionConfig: {},
      } as unknown as onAuthenticatePayload;

      await expect(service.handleAuthenticate(data)).rejects.toThrow(
        new UnauthorizedException('User is not a member of this world.'),
      );
    });

    it('should configure readOnly = true for VIEWER role', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'User' });
      prisma.worldMember.findUnique.mockResolvedValue({ role: 'VIEWER' });

      const params = new URLSearchParams();
      params.set('worldId', 'world-1');
      const connectionConfig: { readOnly?: boolean } = {};

      const data = {
        token: 'valid-token',
        requestParameters: params,
        requestHeaders: new Headers(),
        documentName: 'doc-1',
        connectionConfig,
      } as unknown as onAuthenticatePayload;

      const context = await service.handleAuthenticate(data);

      expect(connectionConfig.readOnly).toBe(true);
      expect(context.role).toBe('VIEWER');
      expect(context.worldId).toBe('world-1');
    });

    it('should configure readOnly = false for EDITOR role', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'User' });
      prisma.worldMember.findUnique.mockResolvedValue({ role: 'EDITOR' });

      const connectionConfig: { readOnly?: boolean } = {};

      const data = {
        token: 'valid-token',
        requestParameters: new URLSearchParams(),
        requestHeaders: new Headers(),
        documentName: 'world-1:doc-1',
        connectionConfig,
      } as unknown as onAuthenticatePayload;

      const context = await service.handleAuthenticate(data);

      expect(connectionConfig.readOnly).toBe(false);
      expect(context.role).toBe('EDITOR');
      expect(context.worldId).toBe('world-1');
    });
  });

  describe('handleStoreDocument', () => {
    it('should convert Y.Doc to AST, save to db and enqueue mentions job', async () => {
      const doc = TiptapTransformer.toYdoc(
        {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Hello world' }],
            },
          ],
        },
        'default',
      );

      prisma.document.updateMany.mockResolvedValue({ count: 1 });
      prisma.card.findFirst.mockResolvedValue({ id: 'card-1' });

      const data = {
        document: doc,
        documentName: 'world-1:doc-1',
        lastContext: { worldId: 'world-1', documentId: 'doc-1' },
      } as unknown as onStoreDocumentPayload;

      await service.handleStoreDocument(data);

      expect(prisma.document.updateMany).toHaveBeenCalledWith({
        where: { id: 'doc-1', worldId: 'world-1' },
        data: expect.objectContaining({
          plainText: expect.any(String),
          contentJson: expect.any(Object),
          yjsState: expect.any(Buffer),
        }),
      });

      expect(mentionsQueue.add).toHaveBeenCalledWith(
        'sync-mentions',
        {
          worldId: 'world-1',
          documentId: 'doc-1',
          cardId: 'card-1',
        },
        expect.objectContaining({
          delay: 1500,
          deduplication: { id: 'mentions:world-1:doc-1' },
        }),
      );
    });
  });

  describe('handleLoadDocument', () => {
    it('should apply existing yjsState to document', async () => {
      const existingDoc = TiptapTransformer.toYdoc(
        {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Pre-existing content' }],
            },
          ],
        },
        'default',
      );
      const update = Y.encodeStateAsUpdate(existingDoc);

      prisma.document.findFirst.mockResolvedValue({
        id: 'doc-1',
        worldId: 'world-1',
        yjsState: Buffer.from(update),
      });

      const targetDoc = new Y.Doc();
      const data = {
        document: targetDoc,
        documentName: 'world-1:doc-1',
        context: { worldId: 'world-1', documentId: 'doc-1' },
      } as unknown as onLoadDocumentPayload;

      await service.handleLoadDocument(data);

      const ast = TiptapTransformer.fromYdoc(targetDoc, 'default') as {
        type: string;
        content: Array<{ type: string; content: Array<{ type: string; text: string }> }>;
      };
      expect(ast.content[0].content[0].text).toBe('Pre-existing content');
    });
  });
});
