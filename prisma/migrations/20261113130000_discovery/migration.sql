-- Typo-tolerant search (docs/PLAN.md "Search") and admin force-hide (SPEC §9).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE "Product" ADD COLUMN "hiddenByAdmin" BOOLEAN NOT NULL DEFAULT false;
