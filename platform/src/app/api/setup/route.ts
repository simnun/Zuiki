import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// One-time database schema initialization
// Visit /api/setup once to create all tables
export async function GET() {
  const steps: string[] = []
  const errors: string[] = []

  const run = async (label: string, sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql)
      steps.push(`✓ ${label}`)
    } catch (e: any) {
      // Ignore "already exists" errors
      if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
        steps.push(`~ ${label} (already exists)`)
      } else {
        errors.push(`✗ ${label}: ${e.message}`)
      }
    }
  }

  // ENUMs (wrapped in DO blocks to handle "already exists")
  await run('enum UserRole', `DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('super_admin', 'owner', 'user', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run('enum SessionStatus', `DO $$ BEGIN CREATE TYPE "SessionStatus" AS ENUM ('draft', 'processing', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run('enum ItemStatus', `DO $$ BEGIN CREATE TYPE "ItemStatus" AS ENUM ('pending', 'processing', 'done', 'error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run('enum PaymentStatus', `DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run('enum TicketStatus', `DO $$ BEGIN CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run('enum ExportType', `DO $$ BEGIN CREATE TYPE "ExportType" AS ENUM ('csv', 'excel', 'photos_zip'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run('enum CampaignType', `DO $$ BEGIN CREATE TYPE "CampaignType" AS ENUM ('payment_reminder', 'newsletter', 'announcement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  await run('enum ShootType', `DO $$ BEGIN CREATE TYPE "ShootType" AS ENUM ('model', 'model_no_size', 'mannequin', 'still', 'mixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`)

  // Add model_no_size to existing ShootType if missing
  await run('ShootType add model_no_size', `DO $$ BEGIN ALTER TYPE "ShootType" ADD VALUE IF NOT EXISTS 'model_no_size'; EXCEPTION WHEN others THEN NULL; END $$`)

  // TABLES
  await run('table companies', `CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiKey" TEXT,
    "vatNumber" TEXT,
    "billingEmail" TEXT,
    "billingAddress" TEXT,
    "pricingPlan" TEXT DEFAULT 'base',
    "walletCredits" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "usedCredits" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "creditRenewalDate" TIMESTAMP(3),
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
  )`)
  await run('index companies_slug', `CREATE UNIQUE INDEX IF NOT EXISTS "companies_slug_key" ON "companies"("slug")`)

  await run('table users', `CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappNumber" TEXT,
    "profilePhoto" TEXT,
    "role" "UserRole" NOT NULL,
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
  )`)
  await run('index users_email', `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`)
  await run('index users_companyId', `CREATE INDEX IF NOT EXISTS "users_companyId_idx" ON "users"("companyId")`)

  await run('table notification_preferences', `CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "emailOnTicketReply" BOOLEAN NOT NULL DEFAULT true,
    "emailOnBilling" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
  )`)

  await run('table models', `CREATE TABLE IF NOT EXISTS "models" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "heightCm" INTEGER,
    "sizeTop" TEXT,
    "sizeBottom" TEXT,
    "sizeBra" TEXT,
    "sizeShoe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
  )`)

  await run('table model_face_photos', `CREATE TABLE IF NOT EXISTS "model_face_photos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "modelId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "model_face_photos_pkey" PRIMARY KEY ("id")
  )`)

  await run('table shooting_sessions', `CREATE TABLE IF NOT EXISTS "shooting_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "shootingDate" DATE NOT NULL,
    "shootType" "ShootType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'draft',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "photosExpiresAt" TIMESTAMP(3),
    CONSTRAINT "shooting_sessions_pkey" PRIMARY KEY ("id")
  )`)
  await run('index shooting_sessions_companyId_createdAt', `CREATE INDEX IF NOT EXISTS "shooting_sessions_companyId_createdAt_idx" ON "shooting_sessions"("companyId", "createdAt")`)

  await run('table session_models', `CREATE TABLE IF NOT EXISTS "session_models" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    CONSTRAINT "session_models_pkey" PRIMARY KEY ("id")
  )`)

  await run('table mannequin_configs', `CREATE TABLE IF NOT EXISTS "mannequin_configs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "bustCm" INTEGER,
    "waistCm" INTEGER,
    "hipsCm" INTEGER,
    CONSTRAINT "mannequin_configs_pkey" PRIMARY KEY ("id")
  )`)
  await run('index mannequin_configs_sessionId', `CREATE UNIQUE INDEX IF NOT EXISTS "mannequin_configs_sessionId_key" ON "mannequin_configs"("sessionId")`)

  await run('table catalog_items', `CREATE TABLE IF NOT EXISTS "catalog_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT,
    "productType" TEXT,
    "suffix" TEXT,
    "color" TEXT,
    "composition" TEXT,
    "shortDesc" TEXT,
    "longDesc" TEXT,
    "seoTags" TEXT,
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "metaKeywords" TEXT,
    "altImage" TEXT,
    "aiResponse" JSONB,
    "license" TEXT,
    "recognizedModel" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
  )`)
  await run('index catalog_items_sessionId', `CREATE INDEX IF NOT EXISTS "catalog_items_sessionId_idx" ON "catalog_items"("sessionId")`)

  await run('table item_photos', `CREATE TABLE IF NOT EXISTS "item_photos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "itemId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "item_photos_pkey" PRIMARY KEY ("id")
  )`)

  await run('table correlations', `CREATE TABLE IF NOT EXISTS "correlations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "outfitName" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "correlations_pkey" PRIMARY KEY ("id")
  )`)

  await run('table correlation_items', `CREATE TABLE IF NOT EXISTS "correlation_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "correlationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "correlation_items_pkey" PRIMARY KEY ("id")
  )`)

  await run('table session_excel_files', `CREATE TABLE IF NOT EXISTS "session_excel_files" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_excel_files_pkey" PRIMARY KEY ("id")
  )`)

  await run('table excel_sku_data', `CREATE TABLE IF NOT EXISTS "excel_sku_data" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "excelFileId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "rowData" JSONB,
    CONSTRAINT "excel_sku_data_pkey" PRIMARY KEY ("id")
  )`)

  await run('table suffix_mappings', `CREATE TABLE IF NOT EXISTS "suffix_mappings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "suffix" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suffix_mappings_pkey" PRIMARY KEY ("id")
  )`)
  await run('col suffix_mappings.suffix', `ALTER TABLE "suffix_mappings" ADD COLUMN IF NOT EXISTS "suffix" TEXT NOT NULL DEFAULT ''`)
  await run('col suffix_mappings.label', `ALTER TABLE "suffix_mappings" ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT ''`)
  await run('col suffix_mappings.companyId', `ALTER TABLE "suffix_mappings" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT ''`)
  await run('index suffix_mappings_unique', `CREATE UNIQUE INDEX IF NOT EXISTS "suffix_mappings_companyId_suffix_key" ON "suffix_mappings"("companyId", "suffix")`)

  await run('table license_memory', `CREATE TABLE IF NOT EXISTS "license_memory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "license_memory_pkey" PRIMARY KEY ("id")
  )`)
  await run('col license_memory.license', `ALTER TABLE "license_memory" ADD COLUMN IF NOT EXISTS "license" TEXT NOT NULL DEFAULT ''`)
  await run('col license_memory.label', `ALTER TABLE "license_memory" ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT ''`)
  await run('col license_memory.companyId', `ALTER TABLE "license_memory" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT ''`)
  await run('index license_memory_unique', `CREATE UNIQUE INDEX IF NOT EXISTS "license_memory_companyId_license_key" ON "license_memory"("companyId", "license")`)

  await run('table usage_records', `CREATE TABLE IF NOT EXISTS "usage_records" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
  )`)

  await run('table monthly_billing', `CREATE TABLE IF NOT EXISTS "monthly_billing" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monthly_billing_pkey" PRIMARY KEY ("id")
  )`)

  await run('table usage_alerts', `CREATE TABLE IF NOT EXISTS "usage_alerts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "thresholdEur" DECIMAL(10,2) NOT NULL,
    "notifyEmail" TEXT,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_alerts_pkey" PRIMARY KEY ("id")
  )`)

  await run('table support_tickets', `CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
  )`)

  await run('table ticket_messages', `CREATE TABLE IF NOT EXISTS "ticket_messages" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
  )`)

  await run('table ticket_attachments', `CREATE TABLE IF NOT EXISTS "ticket_attachments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "ticketId" TEXT NOT NULL,
    "storageKey" TEXT,
    "fileName" TEXT,
    "linkUrl" TEXT,
    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
  )`)

  await run('table session_exports', `CREATE TABLE IF NOT EXISTS "session_exports" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "exportType" "ExportType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "session_exports_pkey" PRIMARY KEY ("id")
  )`)

  await run('table campaigns', `CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "createdById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "targetFilter" JSONB,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
  )`)

  // FOREIGN KEYS (ignore if already exist)
  await run('fk users->companies', `ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE`)
  await run('fk notification_preferences->users', `ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk shooting_sessions->companies', `ALTER TABLE "shooting_sessions" ADD CONSTRAINT "shooting_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk shooting_sessions->users', `ALTER TABLE "shooting_sessions" ADD CONSTRAINT "shooting_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk session_models->sessions', `ALTER TABLE "session_models" ADD CONSTRAINT "session_models_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk session_models->models', `ALTER TABLE "session_models" ADD CONSTRAINT "session_models_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk models->companies', `ALTER TABLE "models" ADD CONSTRAINT "models_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk model_face_photos->models', `ALTER TABLE "model_face_photos" ADD CONSTRAINT "model_face_photos_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk mannequin_configs->sessions', `ALTER TABLE "mannequin_configs" ADD CONSTRAINT "mannequin_configs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk catalog_items->sessions', `ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk item_photos->catalog_items', `ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk correlations->sessions', `ALTER TABLE "correlations" ADD CONSTRAINT "correlations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk correlation_items->correlations', `ALTER TABLE "correlation_items" ADD CONSTRAINT "correlation_items_correlationId_fkey" FOREIGN KEY ("correlationId") REFERENCES "correlations"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk correlation_items->catalog_items', `ALTER TABLE "correlation_items" ADD CONSTRAINT "correlation_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk session_exports->sessions', `ALTER TABLE "session_exports" ADD CONSTRAINT "session_exports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk support_tickets->companies', `ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk support_tickets->users', `ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk ticket_messages->tickets', `ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk ticket_messages->users', `ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk ticket_attachments->tickets', `ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await run('fk suffix_mappings->companies', `ALTER TABLE "suffix_mappings" ADD CONSTRAINT "suffix_mappings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk license_memory->companies', `ALTER TABLE "license_memory" ADD CONSTRAINT "license_memory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk usage_records->companies', `ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk usage_records->sessions', `ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk usage_records->users', `ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk monthly_billing->companies', `ALTER TABLE "monthly_billing" ADD CONSTRAINT "monthly_billing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk usage_alerts->companies', `ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk usage_alerts->users', `ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_setById_fkey" FOREIGN KEY ("setById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
  await run('fk campaigns->users', `ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)

  // Seed: company + admin user
  await run('seed company zuiki', `INSERT INTO "companies" ("id","name","slug","isActive","createdAt","updatedAt") VALUES ('company-zuiki-001','Zuiki','zuiki',true,now(),now()) ON CONFLICT DO NOTHING`)
  await run('seed admin user', `INSERT INTO "users" ("id","email","passwordHash","firstName","lastName","role","companyId","isActive","createdAt","updatedAt") VALUES ('user-admin-001','admin@zuiki.it','$2b$10$Zvhliwj7EoOmtKtKMhfPoeb/H99kaUABW1S0KuumBREkLenT0JLga','Admin','Zuiki','super_admin','company-zuiki-001',true,now(),now()) ON CONFLICT DO NOTHING`)

  const ok = errors.length === 0
  return NextResponse.json({ ok, steps, errors }, { status: ok ? 200 : 207 })
}
