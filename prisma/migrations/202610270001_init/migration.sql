CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');
CREATE TYPE "UploadStatus" AS ENUM ('COMPLETED', 'PENDING', 'UPLOADED', 'LIMIT', 'OUT_OF_STOCK', 'HOLIDAY');
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'UPDATED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STAFF', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Account" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "username" TEXT, "avatarUrl" TEXT, "platform" TEXT,
  "core" TEXT NOT NULL, "subCore" TEXT, "notes" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DailyUpload" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "date" DATE NOT NULL, "status" "UploadStatus" NOT NULL,
  "notes" TEXT, "createdById" TEXT NOT NULL, "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyUpload_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "dailyUploadId" TEXT, "actorId" TEXT NOT NULL,
  "action" "ActivityAction" NOT NULL, "previousStatus" "UploadStatus", "newStatus" "UploadStatus",
  "description" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Account_isActive_core_subCore_idx" ON "Account"("isActive", "core", "subCore");
CREATE INDEX "Account_name_idx" ON "Account"("name");
CREATE UNIQUE INDEX "DailyUpload_accountId_date_key" ON "DailyUpload"("accountId", "date");
CREATE INDEX "DailyUpload_date_status_idx" ON "DailyUpload"("date", "status");
CREATE INDEX "DailyUpload_accountId_date_idx" ON "DailyUpload"("accountId", "date");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX "ActivityLog_accountId_createdAt_idx" ON "ActivityLog"("accountId", "createdAt");
ALTER TABLE "DailyUpload" ADD CONSTRAINT "DailyUpload_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyUpload" ADD CONSTRAINT "DailyUpload_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyUpload" ADD CONSTRAINT "DailyUpload_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_dailyUploadId_fkey" FOREIGN KEY ("dailyUploadId") REFERENCES "DailyUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
