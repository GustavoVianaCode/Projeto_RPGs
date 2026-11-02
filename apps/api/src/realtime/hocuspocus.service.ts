import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Server, onAuthenticatePayload, onLoadDocumentPayload, onStoreDocumentPayload } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';
import * as Y from 'yjs';
import { PrismaService } from '../prisma/prisma.service';
import { extractPlainText, TipTapNode } from '@proj/shared';

export interface HocuspocusContext {
  user: {
    id: string;
    email: string;
    name: string;
  };
  worldId: string;
  role: string;
  documentId: string;
}

@Injectable()
export class HocuspocusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HocuspocusService.name);
  public server: Server | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @InjectQueue('mentions-queue') private readonly mentionsQueue: Queue,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const port = Number(process.env.HOCUSPOCUS_PORT) || 4001;
    this.server = new Server({
      port,
      debounce: 2000,
      maxDebounce: 5000,
      quiet: true,
      onAuthenticate: (data) => this.handleAuthenticate(data),
      onLoadDocument: (data) => this.handleLoadDocument(data),
      onStoreDocument: (data) => this.handleStoreDocument(data),
    });

    await this.server.listen();
    this.logger.log(`Hocuspocus collaboration server listening on port ${port}`);
  }

  async onModuleDestroy() {
    if (this.server) {
      this.server.hocuspocus.flushPendingStores();
      await this.server.destroy();
      this.logger.log('Hocuspocus collaboration server closed');
    }
  }

  /**
   * Hook onAuthenticate:
   * Validates JWT, verifies World membership, and sets readOnly if VIEWER.
   */
  async handleAuthenticate(data: onAuthenticatePayload): Promise<HocuspocusContext> {
    const rawToken =
      data.token ||
      data.requestParameters.get('token') ||
      data.requestHeaders.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!rawToken) {
      throw new UnauthorizedException('Authentication token is missing.');
    }

    let payload: { sub: string; [key: string]: unknown };
    try {
      payload = await this.jwtService.verifyAsync(rawToken, {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'dev_access_secret_super_secure_key_123456',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    // Extract worldId and documentId from requestParameters or documentName (format: worldId:documentId)
    let worldId = data.requestParameters.get('worldId');
    let documentId = data.documentName;

    if (data.documentName.includes(':')) {
      const parts = data.documentName.split(':');
      worldId = parts[0];
      documentId = parts[1];
    }

    if (!worldId) {
      throw new UnauthorizedException('worldId is required in connection parameters.');
    }

    // Verify World membership (Anti-IDOR)
    const membership = await this.prisma.worldMember.findUnique({
      where: {
        worldId_userId: {
          worldId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException('User is not a member of this world.');
    }

    // VIEWER role gets read-only access
    if (membership.role === 'VIEWER') {
      data.connectionConfig.readOnly = true;
    } else {
      data.connectionConfig.readOnly = false;
    }

    return {
      user,
      worldId,
      role: membership.role,
      documentId,
    };
  }

  /**
   * Hook onLoadDocument:
   * Loads existing Yjs binary state or initializes from stored contentJson.
   */
  async handleLoadDocument(data: onLoadDocumentPayload): Promise<Y.Doc> {
    const { documentName, context } = data;
    const typedContext = context as HocuspocusContext | undefined;

    let worldId = typedContext?.worldId;
    let documentId = typedContext?.documentId || documentName;

    if (documentName.includes(':')) {
      const parts = documentName.split(':');
      worldId = parts[0];
      documentId = parts[1];
    }

    if (!worldId || !documentId) {
      return data.document;
    }

    const dbDoc = await this.prisma.document.findFirst({
      where: { id: documentId, worldId, deletedAt: null },
    });

    if (dbDoc?.yjsState) {
      Y.applyUpdate(data.document, dbDoc.yjsState);
    } else if (
      dbDoc?.contentJson &&
      typeof dbDoc.contentJson === 'object' &&
      Object.keys(dbDoc.contentJson).length > 0
    ) {
      const initialDoc = TiptapTransformer.toYdoc(
        dbDoc.contentJson as Record<string, unknown>,
        'default',
      );
      Y.applyUpdate(data.document, Y.encodeStateAsUpdate(initialDoc));
    }

    return data.document;
  }

  /**
   * Hook onStoreDocument:
   * Converts Yjs to ProseMirror AST via TiptapTransformer.fromYdoc(document, 'default'),
   * updates Document in Postgres, and dispatches job to mentions-queue.
   */
  async handleStoreDocument(data: onStoreDocumentPayload): Promise<void> {
    const { document, documentName } = data;
    const typedContext = (data.lastContext || (data as unknown as { context?: unknown }).context) as
      | HocuspocusContext
      | undefined;

    let worldId = typedContext?.worldId;
    let documentId = typedContext?.documentId || documentName;

    if (documentName.includes(':')) {
      const parts = documentName.split(':');
      worldId = parts[0];
      documentId = parts[1];
    }

    if (!worldId || !documentId) {
      return;
    }

    // 1. Convert Yjs to TipTap AST using standard transformer signature
    const contentJson = TiptapTransformer.fromYdoc(document, 'default') as TipTapNode;
    const plainText = extractPlainText(contentJson);
    const yjsState = Buffer.from(Y.encodeStateAsUpdate(document));

    // 2. Persist to Postgres (Anti-IDOR: update by id AND worldId)
    await this.prisma.document.updateMany({
      where: { id: documentId, worldId },
      data: {
        yjsState,
        contentJson: contentJson as any,
        plainText,
      },
    });

    // 3. Find cardId if this document is linked to a card
    const card = await this.prisma.card.findFirst({
      where: { documentId, worldId, deletedAt: null },
      select: { id: true },
    });

    // 4. Dispatch job to mentions-queue with deduplication & debounce delay
    if (this.mentionsQueue) {
      await this.mentionsQueue.add(
        'sync-mentions',
        {
          worldId,
          documentId,
          cardId: card?.id,
        },
        {
          delay: 1500,
          deduplication: {
            id: `mentions:${worldId}:${documentId}`,
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
  }
}
