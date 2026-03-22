-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "license_memory_companyId_descriptionKey_key" ON "license_memory"("companyId", "descriptionKey");
