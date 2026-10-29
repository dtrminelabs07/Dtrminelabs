-- Preserve per-account activity history when an account without operational
-- dependencies is permanently deleted.
ALTER TABLE "ActivityLog" ADD COLUMN "accountName" TEXT;
ALTER TABLE "ActivityLog" ALTER COLUMN "accountId" DROP NOT NULL;

ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_accountId_fkey";
ALTER TABLE "ActivityLog"
  ADD CONSTRAINT "ActivityLog_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
