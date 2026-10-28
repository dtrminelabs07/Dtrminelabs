CREATE TABLE "ProductionAccountComment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionAccountComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionAccountComment_accountId_createdAt_idx" ON "ProductionAccountComment"("accountId", "createdAt");
CREATE INDEX "ProductionAccountComment_authorId_idx" ON "ProductionAccountComment"("authorId");

ALTER TABLE "ProductionAccountComment" ADD CONSTRAINT "ProductionAccountComment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionAccountComment" ADD CONSTRAINT "ProductionAccountComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
