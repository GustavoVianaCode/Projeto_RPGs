import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

describe('Folders, CardTypes, Cards & Trash (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenUserA: string;
  let world1Id: string;
  let world2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Register User A
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `tester_${Date.now()}@world.com`,
        password: 'password123',
        name: 'Master Builder',
      });
    tokenUserA = userRes.body.accessToken;

    // Create World 1
    const w1Res = await request(app.getHttpServer())
      .post('/worlds')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Main Universe',
        slug: `universe-${Date.now()}`,
      });
    world1Id = w1Res.body.id;

    // Create World 2
    const w2Res = await request(app.getHttpServer())
      .post('/worlds')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        name: 'Alien Universe',
        slug: `alien-${Date.now()}`,
      });
    world2Id = w2Res.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('1. Folder Tree & Cycle Prevention', () => {
    let folderAId: string;
    let folderBId: string;

    it('should create root folder A and child folder B', async () => {
      const resA = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/folders`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Folder A' })
        .expect(201);

      folderAId = resA.body.id;

      const resB = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/folders`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Folder B', parentId: folderAId })
        .expect(201);

      folderBId = resB.body.id;
    });

    it('should block moving parent folder A into child folder B with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/worlds/${world1Id}/folders/${folderAId}/move`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ newParentId: folderBId })
        .expect(400);

      expect(res.body.message).toContain('Cannot move a folder into one of its descendants');
    });

    it('should retrieve folders as tree', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worlds/${world1Id}/folders/tree`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      const rootA = res.body.find((f: any) => f.id === folderAId);
      expect(rootA).toBeDefined();
      expect(rootA.children).toHaveLength(1);
      expect(rootA.children[0].id).toBe(folderBId);
    });
  });

  describe('2. CardType Hierarchy, Properties & Card Creation', () => {
    let parentTypeId: string;
    let subtypeId: string;
    let agePropId: string;
    let factionPropId: string;
    let createdCardId: string;

    it('should create parent CardType and property "age"', async () => {
      const typeRes = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/card-types`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Character', slug: `char-${Date.now()}` })
        .expect(201);
      parentTypeId = typeRes.body.id;

      const propRes = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/card-types/${parentTypeId}/properties`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'Age',
          slug: 'age',
          type: 'NUMBER',
          isRequired: true,
        })
        .expect(201);
      agePropId = propRes.body.id;
    });

    it('should create subtype CardType (NPC) and property "faction"', async () => {
      const subtypeRes = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/card-types`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'NPC',
          slug: `npc-${Date.now()}`,
          parentTypeId,
        })
        .expect(201);
      subtypeId = subtypeRes.body.id;

      const propRes = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/card-types/${subtypeId}/properties`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'Faction',
          slug: 'faction',
          type: 'TEXT',
          isRequired: false,
        })
        .expect(201);
      factionPropId = propRes.body.id;
    });

    it('should return inherited properties when fetching subtype', async () => {
      const res = await request(app.getHttpServer())
        .get(`/worlds/${world1Id}/card-types/${subtypeId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.inheritedProperties).toHaveLength(1);
      expect(res.body.inheritedProperties[0].slug).toBe('age');
      expect(res.body.allProperties).toHaveLength(2);
    });

    it('should fail card creation if required inherited property is missing', async () => {
      await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/cards`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Nameless NPC',
          cardTypeId: subtypeId,
          propertyValues: [
            { propertyId: factionPropId, value: 'Rangers' },
          ],
        })
        .expect(400);
    });

    it('should create Card filling both own and inherited properties with auto-generated Document', async () => {
      const res = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/cards`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Elrond Halfelven',
          cardTypeId: subtypeId,
          propertyValues: [
            { propertyId: agePropId, value: 6520 },
            { propertyId: factionPropId, value: 'Rivendell' },
          ],
        })
        .expect(201);

      createdCardId = res.body.id;
      expect(res.body.title).toBe('Elrond Halfelven');
      expect(res.body.slug).toBe('elrond-halfelven');
      expect(res.body.document).toBeDefined();
      expect(res.body.document.plainText).toBe('');
      expect(res.body.properties).toHaveLength(2);
    });
  });

  describe('3. Multi-tenancy & Cross-World IDOR Prevention', () => {
    let foreignFolderId: string;
    let foreignCardTypeId: string;
    let foreignCardId: string;

    beforeAll(async () => {
      // In World 2: create folder, cardType and card
      const fRes = await request(app.getHttpServer())
        .post(`/worlds/${world2Id}/folders`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Foreign Folder' });
      foreignFolderId = fRes.body.id;

      const ctRes = await request(app.getHttpServer())
        .post(`/worlds/${world2Id}/card-types`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Alien Type', slug: `alien-${Date.now()}` });
      foreignCardTypeId = ctRes.body.id;

      const cRes = await request(app.getHttpServer())
        .post(`/worlds/${world2Id}/cards`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Alien Card', cardTypeId: foreignCardTypeId });
      foreignCardId = cRes.body.id;
    });

    it('should reject creating a card in World 1 using a folder from World 2', async () => {
      const ct = await prisma.cardType.findFirst({ where: { worldId: world1Id } });
      await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/cards`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Intruder Card',
          cardTypeId: ct!.id,
          folderId: foreignFolderId,
        })
        .expect(404);
    });

    it('should reject creating a card in World 1 using a cardTypeId from World 2', async () => {
      await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/cards`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Intruder Type Card',
          cardTypeId: foreignCardTypeId,
        })
        .expect(404);
    });

    it('should reject referencing a targetCard from World 2 in a CARD_REFERENCE property', async () => {
      const ct = await prisma.cardType.findFirst({ where: { worldId: world1Id } });
      const prop = await prisma.propertyDefinition.create({
        data: {
          worldId: world1Id,
          cardTypeId: ct!.id,
          name: 'Nemesis',
          slug: `nemesis-${Date.now()}`,
          type: 'CARD_REFERENCE',
        },
      });

      await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/cards`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Hero Card',
          cardTypeId: ct!.id,
          propertyValues: [
            { propertyId: prop.id, value: foreignCardId, targetCardId: foreignCardId },
          ],
        })
        .expect(400);
    });
  });

  describe('4. Soft-delete Cascade & Trash Restoration', () => {
    let parentFolderId: string;
    let subFolderId: string;
    let cardInsideId: string;

    beforeAll(async () => {
      const noteType = await prisma.cardType.create({
        data: {
          worldId: world1Id,
          name: 'Item Note',
          slug: `item-note-${Date.now()}`,
        },
      });

      const fParent = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/folders`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Archive Parent' })
        .expect(201);
      parentFolderId = fParent.body.id;

      const fChild = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/folders`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Archive Subfolder', parentId: parentFolderId })
        .expect(201);
      subFolderId = fChild.body.id;

      const card = await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/cards`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Secret Blueprint',
          cardTypeId: noteType.id,
          folderId: subFolderId,
        })
        .expect(201);
      cardInsideId = card.body.id;
    });

    it('should cascade soft-delete parent folder, subfolder, and cards', async () => {
      await request(app.getHttpServer())
        .delete(`/worlds/${world1Id}/folders/${parentFolderId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      // Verify they no longer appear in standard active lists
      const foldersRes = await request(app.getHttpServer())
        .get(`/worlds/${world1Id}/folders`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
      expect(foldersRes.body.some((f: any) => f.id === parentFolderId)).toBe(false);
      expect(foldersRes.body.some((f: any) => f.id === subFolderId)).toBe(false);

      const cardsRes = await request(app.getHttpServer())
        .get(`/worlds/${world1Id}/cards`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
      expect(cardsRes.body.some((c: any) => c.id === cardInsideId)).toBe(false);
    });

    it('should show deleted items in trash endpoint', async () => {
      const trashRes = await request(app.getHttpServer())
        .get(`/worlds/${world1Id}/trash`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(trashRes.body.folders.some((f: any) => f.id === parentFolderId)).toBe(true);
      expect(trashRes.body.folders.some((f: any) => f.id === subFolderId)).toBe(true);
      expect(trashRes.body.cards.some((c: any) => c.id === cardInsideId)).toBe(true);
    });

    it('should restore card to root (folderId=null) if parent folder remains deleted', async () => {
      await request(app.getHttpServer())
        .post(`/worlds/${world1Id}/trash/restore`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ itemType: 'CARD', id: cardInsideId })
        .expect(201);

      // Card is now restored and active
      const restored = await request(app.getHttpServer())
        .get(`/worlds/${world1Id}/cards/${cardInsideId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(restored.body.deletedAt).toBeNull();
      expect(restored.body.folderId).toBeNull(); // Reset to root because subfolder is still in trash!
    });
  });
});
