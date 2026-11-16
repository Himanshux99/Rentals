-- Product review (moderation) and Direct Upload Mode.
CREATE TYPE "Moderation" AS ENUM ('pending', 'approved', 'rejected');

-- products that were live before review existed stay live; new rows default to pending
ALTER TABLE "Product"
  ADD COLUMN "moderation" "Moderation" NOT NULL DEFAULT 'approved',
  ADD COLUMN "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "rejectReason" TEXT,
  ADD COLUMN "rejectNote" TEXT;
ALTER TABLE "Product" ALTER COLUMN "moderation" SET DEFAULT 'pending';
UPDATE "Product" SET "submittedAt" = "createdAt";

CREATE INDEX "Product_moderation_submittedAt_idx" ON "Product"("moderation", "submittedAt");

CREATE TABLE "SiteSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "directUpload" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
INSERT INTO "SiteSetting" ("id", "directUpload", "updatedAt") VALUES (1, false, CURRENT_TIMESTAMP);
