CREATE TABLE "ProductionProduct" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "creationKey" TEXT,
    "name" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductionProduct_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductionProduct_targetCount_check" CHECK ("targetCount" > 0),
    CONSTRAINT "ProductionProduct_completedCount_check" CHECK ("completedCount" >= 0 AND "completedCount" <= "targetCount")
);

CREATE TABLE "ProductionComment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductionProgressChange" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "previousCompletedCount" INTEGER NOT NULL,
    "newCompletedCount" INTEGER NOT NULL,
    "previousTargetCount" INTEGER,
    "newTargetCount" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionProgressChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionProduct_accountId_isArchived_updatedAt_idx" ON "ProductionProduct"("accountId", "isArchived", "updatedAt");
CREATE INDEX "ProductionProduct_createdAt_idx" ON "ProductionProduct"("createdAt");
CREATE UNIQUE INDEX "ProductionProduct_accountId_creationKey_key" ON "ProductionProduct"("accountId", "creationKey");
CREATE INDEX "ProductionComment_productId_createdAt_idx" ON "ProductionComment"("productId", "createdAt");
CREATE INDEX "ProductionComment_authorId_idx" ON "ProductionComment"("authorId");
CREATE INDEX "ProductionProgressChange_productId_createdAt_idx" ON "ProductionProgressChange"("productId", "createdAt");
CREATE INDEX "ProductionProgressChange_actorId_idx" ON "ProductionProgressChange"("actorId");

ALTER TABLE "ProductionProduct" ADD CONSTRAINT "ProductionProduct_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionProduct" ADD CONSTRAINT "ProductionProduct_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionComment" ADD CONSTRAINT "ProductionComment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductionProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionComment" ADD CONSTRAINT "ProductionComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionProgressChange" ADD CONSTRAINT "ProductionProgressChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductionProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionProgressChange" ADD CONSTRAINT "ProductionProgressChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
