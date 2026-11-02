-- CreateTable
CREATE TABLE "mentions" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "sourceCardId" TEXT NOT NULL,
    "targetCardId" TEXT NOT NULL,
    "contextText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentions_worldId_sourceCardId_idx" ON "mentions"("worldId", "sourceCardId");

-- CreateIndex
CREATE INDEX "mentions_worldId_targetCardId_idx" ON "mentions"("worldId", "targetCardId");

-- CreateIndex
CREATE UNIQUE INDEX "mentions_sourceCardId_targetCardId_key" ON "mentions"("sourceCardId", "targetCardId");

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_sourceCardId_worldId_fkey" FOREIGN KEY ("sourceCardId", "worldId") REFERENCES "cards"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_targetCardId_worldId_fkey" FOREIGN KEY ("targetCardId", "worldId") REFERENCES "cards"("id", "worldId") ON DELETE CASCADE ON UPDATE CASCADE;
