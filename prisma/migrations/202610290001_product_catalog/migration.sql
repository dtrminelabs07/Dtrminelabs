CREATE TABLE "ProductTemplate" (
    "id" TEXT NOT NULL,
    "creationKey" TEXT,
    "name" TEXT NOT NULL,
    "core" TEXT,
    "subCore" TEXT,
    "description" TEXT,
    "defaultTarget" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductTemplate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductTemplate_defaultTarget_check" CHECK ("defaultTarget" IS NULL OR "defaultTarget" > 0)
);

ALTER TABLE "ProductionProduct" ADD COLUMN "templateId" TEXT;

WITH legacy_indexed AS (
    SELECT
        pp."id", pp."name", pp."description", pp."createdById", pp."createdAt", pp."updatedAt",
        a."core", a."subCore",
        lower(trim(pp."name")) AS normalized_name,
        lower(coalesce(a."core", '')) AS normalized_core,
        lower(coalesce(a."subCore", '')) AS normalized_sub_core,
        lower(trim(coalesce(pp."description", ''))) AS normalized_description,
        row_number() OVER (
            PARTITION BY pp."accountId", lower(trim(pp."name")), lower(coalesce(a."core", '')),
                         lower(coalesce(a."subCore", '')), lower(trim(coalesce(pp."description", '')))
            ORDER BY pp."createdAt", pp."id"
        ) AS duplicate_number
    FROM "ProductionProduct" pp
    JOIN "Account" a ON a."id" = pp."accountId"
)
INSERT INTO "ProductTemplate" (
    "id", "name", "core", "subCore", "description", "defaultTarget", "isArchived",
    "createdById", "createdAt", "updatedAt"
)
SELECT
    'legacy_' || md5(normalized_name || '|' || normalized_core || '|' || normalized_sub_core || '|' || normalized_description || '|' || duplicate_number::text),
    min("name"), min("core"), min("subCore"), min("description"), NULL, false,
    min("createdById"), min("createdAt"), max("updatedAt")
FROM legacy_indexed
GROUP BY normalized_name, normalized_core, normalized_sub_core, normalized_description, duplicate_number;

WITH legacy_indexed AS (
    SELECT
        pp."id", pp."name", pp."description", a."core", a."subCore",
        lower(trim(pp."name")) AS normalized_name,
        lower(coalesce(a."core", '')) AS normalized_core,
        lower(coalesce(a."subCore", '')) AS normalized_sub_core,
        lower(trim(coalesce(pp."description", ''))) AS normalized_description,
        row_number() OVER (
            PARTITION BY pp."accountId", lower(trim(pp."name")), lower(coalesce(a."core", '')),
                         lower(coalesce(a."subCore", '')), lower(trim(coalesce(pp."description", '')))
            ORDER BY pp."createdAt", pp."id"
        ) AS duplicate_number
    FROM "ProductionProduct" pp
    JOIN "Account" a ON a."id" = pp."accountId"
)
UPDATE "ProductionProduct" pp
SET "templateId" = 'legacy_' || md5(legacy.normalized_name || '|' || legacy.normalized_core || '|' || legacy.normalized_sub_core || '|' || legacy.normalized_description || '|' || legacy.duplicate_number::text)
FROM legacy_indexed legacy
WHERE pp."id" = legacy."id";

ALTER TABLE "ProductionProduct" ALTER COLUMN "templateId" SET NOT NULL;

CREATE UNIQUE INDEX "ProductTemplate_creationKey_key" ON "ProductTemplate"("creationKey");
CREATE INDEX "ProductTemplate_isArchived_name_idx" ON "ProductTemplate"("isArchived", "name");
CREATE INDEX "ProductTemplate_core_subCore_idx" ON "ProductTemplate"("core", "subCore");
CREATE UNIQUE INDEX "ProductionProduct_accountId_templateId_key" ON "ProductionProduct"("accountId", "templateId");
CREATE INDEX "ProductionProduct_templateId_idx" ON "ProductionProduct"("templateId");

ALTER TABLE "ProductionProduct" ADD CONSTRAINT "ProductionProduct_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductTemplate" ADD CONSTRAINT "ProductTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
