ALTER TYPE "UserRole" ADD VALUE 'DEMO';

ALTER TABLE "Account" ADD COLUMN "ownerId" TEXT;

ALTER TABLE "Account"
ADD CONSTRAINT "Account_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Account_ownerId_isActive_core_subCore_idx"
ON "Account"("ownerId", "isActive", "core", "subCore");
