-- AlterTable
ALTER TABLE "companies" ADD COLUMN "apiKey" TEXT;
ALTER TABLE "companies" ADD COLUMN "vatNumber" TEXT;
ALTER TABLE "companies" ADD COLUMN "billingEmail" TEXT;
ALTER TABLE "companies" ADD COLUMN "billingAddress" TEXT;
ALTER TABLE "companies" ADD COLUMN "pricingPlan" TEXT DEFAULT 'base';
ALTER TABLE "companies" ADD COLUMN "walletCredits" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "companies" ADD COLUMN "usedCredits" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "companies" ADD COLUMN "creditRenewalDate" TIMESTAMP(3);
