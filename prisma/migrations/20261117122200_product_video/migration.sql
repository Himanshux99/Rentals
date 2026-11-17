-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('image', 'video');

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "kind" "MediaKind" NOT NULL DEFAULT 'image',
ADD COLUMN     "posterKey" TEXT;
