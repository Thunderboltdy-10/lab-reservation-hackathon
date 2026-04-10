CREATE TABLE IF NOT EXISTS "EquipmentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EquipmentCategory_name_key" ON "EquipmentCategory"("name");

ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Equipment_categoryId_fkey'
    ) THEN
        ALTER TABLE "Equipment"
            ADD CONSTRAINT "Equipment_categoryId_fkey"
            FOREIGN KEY ("categoryId")
            REFERENCES "EquipmentCategory"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Equipment_labId_categoryId_idx" ON "Equipment"("labId", "categoryId");

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Equipment'
          AND column_name = 'category'
    ) THEN
        INSERT INTO "EquipmentCategory" ("id", "name", "createdAt")
        SELECT CONCAT('eqcat_', md5(BTRIM("category"))), BTRIM("category"), NOW()
        FROM "Equipment"
        WHERE "category" IS NOT NULL AND BTRIM("category") <> ''
        ON CONFLICT ("name") DO NOTHING;

        UPDATE "Equipment" AS e
        SET "categoryId" = c."id"
        FROM "EquipmentCategory" AS c
        WHERE e."categoryId" IS NULL
          AND e."category" IS NOT NULL
          AND BTRIM(e."category") <> ''
          AND c."name" = BTRIM(e."category");

        ALTER TABLE "Equipment" DROP COLUMN "category";
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "EquipmentBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentBrand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EquipmentBrand_name_key" ON "EquipmentBrand"("name");

INSERT INTO "EquipmentBrand" ("id", "name", "createdAt")
SELECT CONCAT('eqbrand_', md5(BTRIM("brand"))), BTRIM("brand"), NOW()
FROM "Equipment"
WHERE "brand" IS NOT NULL AND BTRIM("brand") <> ''
ON CONFLICT ("name") DO NOTHING;
