-- CreateTable
CREATE TABLE "timelines" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "cardId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dateText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "plainText" TEXT NOT NULL DEFAULT '',
    "label" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "timelines_id_worldId_key" ON "timelines"("id", "worldId");
CREATE INDEX "timelines_worldId_idx" ON "timelines"("worldId");
CREATE INDEX "timelines_deletedAt_idx" ON "timelines"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_events_id_worldId_key" ON "timeline_events"("id", "worldId");
CREATE INDEX "timeline_events_worldId_timelineId_idx" ON "timeline_events"("worldId", "timelineId");
CREATE INDEX "timeline_events_worldId_cardId_idx" ON "timeline_events"("worldId", "cardId");
CREATE INDEX "timeline_events_deletedAt_idx" ON "timeline_events"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_id_worldId_key" ON "document_versions"("id", "worldId");
CREATE INDEX "document_versions_worldId_cardId_idx" ON "document_versions"("worldId", "cardId");
CREATE INDEX "document_versions_worldId_documentId_idx" ON "document_versions"("worldId", "documentId");

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_timelineId_worldId_fkey" FOREIGN KEY ("timelineId", "worldId") REFERENCES "timelines"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_cardId_worldId_fkey" FOREIGN KEY ("cardId", "worldId") REFERENCES "cards"("id", "worldId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_cardId_worldId_fkey" FOREIGN KEY ("cardId", "worldId") REFERENCES "cards"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_worldId_fkey" FOREIGN KEY ("documentId", "worldId") REFERENCES "documents"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

