-- CreateTable
CREATE TABLE "Fabric" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Fabric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DesignToFabric" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DesignToFabric_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DesignToWork" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DesignToWork_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ColourToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ColourToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fabric_slug_key" ON "Fabric"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Work_slug_key" ON "Work"("slug");

-- CreateIndex
CREATE INDEX "_DesignToFabric_B_index" ON "_DesignToFabric"("B");

-- CreateIndex
CREATE INDEX "_DesignToWork_B_index" ON "_DesignToWork"("B");

-- CreateIndex
CREATE INDEX "_ColourToProduct_B_index" ON "_ColourToProduct"("B");

-- AddForeignKey
ALTER TABLE "_DesignToFabric" ADD CONSTRAINT "_DesignToFabric_A_fkey" FOREIGN KEY ("A") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DesignToFabric" ADD CONSTRAINT "_DesignToFabric_B_fkey" FOREIGN KEY ("B") REFERENCES "Fabric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DesignToWork" ADD CONSTRAINT "_DesignToWork_A_fkey" FOREIGN KEY ("A") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DesignToWork" ADD CONSTRAINT "_DesignToWork_B_fkey" FOREIGN KEY ("B") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ColourToProduct" ADD CONSTRAINT "_ColourToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Colour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ColourToProduct" ADD CONSTRAINT "_ColourToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Each product keeps its old single colour, then the column goes
INSERT INTO "_ColourToProduct" ("A", "B") SELECT "colourId", "id" FROM "Product";
ALTER TABLE "Product" DROP CONSTRAINT "Product_colourId_fkey";
ALTER TABLE "Product" DROP COLUMN "colourId";
