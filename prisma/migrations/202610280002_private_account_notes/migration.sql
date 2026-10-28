CREATE TABLE "AccountNote" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountNote_accountId_createdAt_idx" ON "AccountNote"("accountId", "createdAt");
CREATE INDEX "AccountNote_authorId_idx" ON "AccountNote"("authorId");

ALTER TABLE "AccountNote"
ADD CONSTRAINT "AccountNote_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccountNote"
ADD CONSTRAINT "AccountNote_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AccountNote" ("id", "accountId", "authorId", "content", "createdAt", "updatedAt")
SELECT md5('legacy-account-note:' || "id"), "id", NULL, "notes", "createdAt", "updatedAt"
FROM "Account"
WHERE "notes" IS NOT NULL AND length(btrim("notes")) > 0;
