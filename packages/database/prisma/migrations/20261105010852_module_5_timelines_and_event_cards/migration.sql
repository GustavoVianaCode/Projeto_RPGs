-- AlterTable
ALTER TABLE "timelines" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "timeline_event_cards" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_event_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timeline_event_cards_worldId_eventId_idx" ON "timeline_event_cards"("worldId", "eventId");

-- CreateIndex
CREATE INDEX "timeline_event_cards_worldId_cardId_idx" ON "timeline_event_cards"("worldId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_event_cards_eventId_cardId_key" ON "timeline_event_cards"("eventId", "cardId");

-- CreateIndex
CREATE INDEX "timelines_worldId_folderId_idx" ON "timelines"("worldId", "folderId");

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_folderId_worldId_fkey" FOREIGN KEY ("folderId", "worldId") REFERENCES "folders"("id", "worldId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_event_cards" ADD CONSTRAINT "timeline_event_cards_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_event_cards" ADD CONSTRAINT "timeline_event_cards_eventId_worldId_fkey" FOREIGN KEY ("eventId", "worldId") REFERENCES "timeline_events"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_event_cards" ADD CONSTRAINT "timeline_event_cards_cardId_worldId_fkey" FOREIGN KEY ("cardId", "worldId") REFERENCES "cards"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;
