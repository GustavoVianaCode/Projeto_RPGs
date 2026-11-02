import { Controller, Get, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { WorldRole } from '@proj/database';

@Controller()
export class RealtimeController {
  private readonly logger = new Logger(RealtimeController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Endpoint de conveniência para desenvolvimento e testes visuais do editor.
   * Cria automaticamente usuário, mundo, membro e documento de teste caso não existam,
   * e retorna credenciais prontas para o HocuspocusProvider conectar via WebSocket.
   */
  @Get(['dev/editor-session', 'api/dev/editor-session'])
  async getDevEditorSession() {
    this.logger.log('Bootstrapping/Fetching dev session for visual test');

    // 1. Garantir Usuário de Teste
    let user = await this.prisma.user.findUnique({
      where: { email: 'dev@cybercore.local' },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: 'dev@cybercore.local',
          name: 'Cybercore Dev',
          isVerified: true,
        },
      });
    }

    // 2. Garantir Mundo de Teste
    let world = await this.prisma.world.findUnique({
      where: { slug: 'dev-world' },
    });
    if (!world) {
      world = await this.prisma.world.create({
        data: {
          name: 'Mundo de Teste Cybercore',
          slug: 'dev-world',
          description: 'Ambiente de teste e colaboração em tempo real',
        },
      });
    }

    // 3. Garantir Associação como OWNER
    let member = await this.prisma.worldMember.findUnique({
      where: {
        worldId_userId: {
          worldId: world.id,
          userId: user.id,
        },
      },
    });
    if (!member) {
      member = await this.prisma.worldMember.create({
        data: {
          worldId: world.id,
          userId: user.id,
          role: WorldRole.OWNER,
        },
      });
    }

    // 4. Garantir CardType
    let cardType = await this.prisma.cardType.findFirst({
      where: { worldId: world.id, slug: 'geral' },
    });
    if (!cardType) {
      cardType = await this.prisma.cardType.create({
        data: {
          worldId: world.id,
          name: 'Geral',
          slug: 'geral',
        },
      });
    }

    // 5. Garantir Documento e Card de Teste
    let card = await this.prisma.card.findFirst({
      where: { worldId: world.id, slug: 'card-teste', deletedAt: null },
      include: { document: true },
    });

    if (!card) {
      const doc = await this.prisma.document.create({
        data: {
          worldId: world.id,
          contentJson: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Documento Colaborativo - Cybercore Systems' }],
              },
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Este documento está sincronizado em tempo real via ' },
                  { type: 'text', text: 'WebSocket (Hocuspocus + Yjs)', marks: [{ type: 'bold' }] },
                  { type: 'text', text: '.' },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Abra esta mesma página em ' },
                  { type: 'text', text: 'duas abas lado a lado', marks: [{ type: 'italic' }] },
                  { type: 'text', text: ' para ver a digitação simultânea!' },
                ],
              },
            ],
          },
          plainText:
            'Documento Colaborativo - Cybercore Systems. Este documento está sincronizado em tempo real via WebSocket (Hocuspocus + Yjs). Abra esta mesma página em duas abas lado a lado para ver a digitação simultânea!',
        },
      });

      card = await this.prisma.card.create({
        data: {
          worldId: world.id,
          cardTypeId: cardType.id,
          documentId: doc.id,
          title: 'Documento de Teste',
          slug: 'card-teste',
        },
        include: { document: true },
      });
    }

    // 6. Gerar Token JWT Válido
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ||
          'dev_access_secret_super_secure_key_123456',
        expiresIn: '7d',
      },
    );

    return {
      success: true,
      token,
      worldId: world.id,
      documentId: card.documentId,
      cardId: card.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      websocketUrl: process.env.HOCUSPOCUS_URL || 'ws://localhost:4001',
    };
  }
}

