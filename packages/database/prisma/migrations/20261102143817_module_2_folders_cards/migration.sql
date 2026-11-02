-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'CARD_REFERENCE');

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_types" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "parentTypeId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "defaultBlocks" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "card_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_definitions" (
    "id" TEXT NOT NULL,
    "cardTypeId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "yjsState" BYTEA,
    "contentJson" JSONB,
    "plainText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "cardTypeId" TEXT NOT NULL,
    "folderId" TEXT,
    "parentCardId" TEXT,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "coverUrl" TEXT,
    "icon" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_property_values" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "targetCardId" TEXT,

    CONSTRAINT "card_property_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folders_worldId_parentId_idx" ON "folders"("worldId", "parentId");

-- CreateIndex
CREATE INDEX "folders_deletedAt_idx" ON "folders"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "folders_id_worldId_key" ON "folders"("id", "worldId");

-- CreateIndex
CREATE INDEX "card_types_deletedAt_idx" ON "card_types"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "card_types_id_worldId_key" ON "card_types"("id", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "card_types_worldId_slug_key" ON "card_types"("worldId", "slug");

-- CreateIndex
CREATE INDEX "property_definitions_worldId_idx" ON "property_definitions"("worldId");

-- CreateIndex
CREATE UNIQUE INDEX "property_definitions_id_worldId_key" ON "property_definitions"("id", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "property_definitions_cardTypeId_slug_key" ON "property_definitions"("cardTypeId", "slug");

-- CreateIndex
CREATE INDEX "documents_worldId_idx" ON "documents"("worldId");

-- CreateIndex
CREATE INDEX "documents_deletedAt_idx" ON "documents"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "documents_id_worldId_key" ON "documents"("id", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "cards_documentId_key" ON "cards"("documentId");

-- CreateIndex
CREATE INDEX "cards_worldId_folderId_idx" ON "cards"("worldId", "folderId");

-- CreateIndex
CREATE INDEX "cards_worldId_cardTypeId_idx" ON "cards"("worldId", "cardTypeId");

-- CreateIndex
CREATE INDEX "cards_worldId_parentCardId_idx" ON "cards"("worldId", "parentCardId");

-- CreateIndex
CREATE INDEX "cards_deletedAt_idx" ON "cards"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cards_id_worldId_key" ON "cards"("id", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "cards_documentId_worldId_key" ON "cards"("documentId", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "cards_worldId_slug_key" ON "cards"("worldId", "slug");

-- CreateIndex
CREATE INDEX "card_property_values_worldId_targetCardId_idx" ON "card_property_values"("worldId", "targetCardId");

-- CreateIndex
CREATE UNIQUE INDEX "card_property_values_cardId_propertyId_key" ON "card_property_values"("cardId", "propertyId");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_worldId_fkey" FOREIGN KEY ("parentId", "worldId") REFERENCES "folders"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_types" ADD CONSTRAINT "card_types_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_types" ADD CONSTRAINT "card_types_parentTypeId_worldId_fkey" FOREIGN KEY ("parentTypeId", "worldId") REFERENCES "card_types"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_definitions" ADD CONSTRAINT "property_definitions_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_definitions" ADD CONSTRAINT "property_definitions_cardTypeId_worldId_fkey" FOREIGN KEY ("cardTypeId", "worldId") REFERENCES "card_types"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_cardTypeId_worldId_fkey" FOREIGN KEY ("cardTypeId", "worldId") REFERENCES "card_types"("id", "worldId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_folderId_worldId_fkey" FOREIGN KEY ("folderId", "worldId") REFERENCES "folders"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_parentCardId_worldId_fkey" FOREIGN KEY ("parentCardId", "worldId") REFERENCES "cards"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_documentId_worldId_fkey" FOREIGN KEY ("documentId", "worldId") REFERENCES "documents"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_property_values" ADD CONSTRAINT "card_property_values_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_property_values" ADD CONSTRAINT "card_property_values_cardId_worldId_fkey" FOREIGN KEY ("cardId", "worldId") REFERENCES "cards"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_property_values" ADD CONSTRAINT "card_property_values_propertyId_worldId_fkey" FOREIGN KEY ("propertyId", "worldId") REFERENCES "property_definitions"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_property_values" ADD CONSTRAINT "card_property_values_targetCardId_worldId_fkey" FOREIGN KEY ("targetCardId", "worldId") REFERENCES "cards"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: card cannot belong to folder and parentCard simultaneously
ALTER TABLE "cards" ADD CONSTRAINT "check_folder_xor_parent_card"
CHECK (
  ("folderId" IS NULL AND "parentCardId" IS NOT NULL) OR
  ("folderId" IS NOT NULL AND "parentCardId" IS NULL) OR
  ("folderId" IS NULL AND "parentCardId" IS NULL)
);
