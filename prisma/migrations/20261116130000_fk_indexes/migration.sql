-- Postgres does not index foreign keys; the catalog joins Product -> Design -> Shop on every listing.
CREATE INDEX "Shop_areaId_idx" ON "Shop"("areaId");
CREATE INDEX "Design_shopId_idx" ON "Design"("shopId");
CREATE INDEX "Design_categoryId_idx" ON "Design"("categoryId");
CREATE INDEX "Product_designId_idx" ON "Product"("designId");
