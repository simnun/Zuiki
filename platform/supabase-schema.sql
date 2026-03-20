-- Zuiki Catalogo - Database Schema
-- Incolla questo nel SQL Editor di Supabase e clicca Run

-- ENUMS
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'owner', 'user', 'admin');
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'processing', 'completed', 'failed');
CREATE TYPE "ItemStatus" AS ENUM ('pending', 'processing', 'done', 'error');
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'overdue');
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE "ExportType" AS ENUM ('csv', 'excel', 'photos_zip');
CREATE TYPE "CampaignType" AS ENUM ('payment_reminder', 'newsletter', 'announcement');
CREATE TYPE "ShootType" AS ENUM ('model', 'mannequin', 'still', 'mixed');

-- COMPANIES
CREATE TABLE "companies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- USERS
CREATE TABLE "users" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- NOTIFICATION PREFERENCES
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyUserActivity" BOOLEAN NOT NULL DEFAULT true,
    "notifyMonthlyReports" BOOLEAN NOT NULL DEFAULT true,
    "notifyMarketing" BOOLEAN NOT NULL DEFAULT false,
    "notifyNewInvoice" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentReminder" BOOLEAN NOT NULL DEFAULT true,
    "notifyLimitExceeded" BOOLEAN NOT NULL DEFAULT true,
    "notifyProcessingComplete" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- SHOOTING SESSIONS
CREATE TABLE "shooting_sessions" (
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
    CONSTRAINT "shooting_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "shooting_sessions_companyId_createdAt_idx" ON "shooting_sessions"("companyId", "createdAt");

-- SESSION MODELS
CREATE TABLE "session_models" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    CONSTRAINT "session_models_pkey" PRIMARY KEY ("id")
);

-- MODELS
CREATE TABLE "models" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "heightCm" INTEGER,
    "sizeTop" TEXT,
    "sizeBottom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- MODEL FACE PHOTOS
CREATE TABLE "model_face_photos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "modelId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    CONSTRAINT "model_face_photos_pkey" PRIMARY KEY ("id")
);

-- MANNEQUIN CONFIGS
CREATE TABLE "mannequin_configs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "size" TEXT,
    "bustCm" INTEGER,
    "waistCm" INTEGER,
    "hipsCm" INTEGER,
    CONSTRAINT "mannequin_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mannequin_configs_sessionId_key" ON "mannequin_configs"("sessionId");

-- CATALOG ITEMS
CREATE TABLE "catalog_items" (
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
    "errorMessage" TEXT,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "catalog_items_sessionId_sku_idx" ON "catalog_items"("sessionId", "sku");

-- ITEM PHOTOS
CREATE TABLE "item_photos" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "itemId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "colorGroup" TEXT,
    "shotType" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    CONSTRAINT "item_photos_pkey" PRIMARY KEY ("id")
);

-- CORRELATIONS
CREATE TABLE "correlations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "outfitName" TEXT,
    "reason" TEXT,
    CONSTRAINT "correlations_pkey" PRIMARY KEY ("id")
);

-- CORRELATION ITEMS
CREATE TABLE "correlation_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "correlationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "correlation_items_pkey" PRIMARY KEY ("id")
);

-- SESSION EXCEL FILES
CREATE TABLE "session_excel_files" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "rowCount" INTEGER,
    "mappedCount" INTEGER,
    CONSTRAINT "session_excel_files_pkey" PRIMARY KEY ("id")
);

-- EXCEL SKU DATA
CREATE TABLE "excel_sku_data" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "excelFileId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "colors" TEXT,
    "year" TEXT,
    "season" TEXT,
    "articleType" TEXT,
    "brand" TEXT,
    "characteristic" TEXT,
    "composition" TEXT,
    CONSTRAINT "excel_sku_data_pkey" PRIMARY KEY ("id")
);

-- SUFFIX MAPPINGS
CREATE TABLE "suffix_mappings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "suffixCode" TEXT NOT NULL,
    "articleType" TEXT NOT NULL,
    CONSTRAINT "suffix_mappings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "suffix_mappings_companyId_suffixCode_key" ON "suffix_mappings"("companyId", "suffixCode");

-- LICENSE MEMORY
CREATE TABLE "license_memory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "descriptionKey" TEXT NOT NULL,
    "licenseValue" TEXT NOT NULL,
    CONSTRAINT "license_memory_pkey" PRIMARY KEY ("id")
);

-- USAGE RECORDS
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imagesProcessed" INTEGER NOT NULL DEFAULT 0,
    "aiCallsMade" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" BIGINT NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- MONTHLY BILLING
CREATE TABLE "monthly_billing" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "totalAiCalls" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "invoiceKey" TEXT,
    "invoiceName" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "monthly_billing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "monthly_billing_companyId_month_key" ON "monthly_billing"("companyId", "month");

-- USAGE ALERTS
CREATE TABLE "usage_alerts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "setById" TEXT NOT NULL,
    "thresholdEuros" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "usage_alerts_pkey" PRIMARY KEY ("id")
);

-- SUPPORT TICKETS
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_tickets_companyId_status_idx" ON "support_tickets"("companyId", "status");

-- TICKET MESSAGES
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- TICKET ATTACHMENTS
CREATE TABLE "ticket_attachments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "ticketId" TEXT NOT NULL,
    "storageKey" TEXT,
    "fileName" TEXT,
    "linkUrl" TEXT,
    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- SESSION EXPORTS
CREATE TABLE "session_exports" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionId" TEXT NOT NULL,
    "exportType" "ExportType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "session_exports_pkey" PRIMARY KEY ("id")
);

-- CAMPAIGNS
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "createdById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "targetFilter" JSONB,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- FOREIGN KEYS
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shooting_sessions" ADD CONSTRAINT "shooting_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shooting_sessions" ADD CONSTRAINT "shooting_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_models" ADD CONSTRAINT "session_models_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_models" ADD CONSTRAINT "session_models_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "models" ADD CONSTRAINT "models_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "model_face_photos" ADD CONSTRAINT "model_face_photos_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mannequin_configs" ADD CONSTRAINT "mannequin_configs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_photos" ADD CONSTRAINT "item_photos_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "correlations" ADD CONSTRAINT "correlations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "correlation_items" ADD CONSTRAINT "correlation_items_correlationId_fkey" FOREIGN KEY ("correlationId") REFERENCES "correlations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "correlation_items" ADD CONSTRAINT "correlation_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_excel_files" ADD CONSTRAINT "session_excel_files_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "excel_sku_data" ADD CONSTRAINT "excel_sku_data_excelFileId_fkey" FOREIGN KEY ("excelFileId") REFERENCES "session_excel_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suffix_mappings" ADD CONSTRAINT "suffix_mappings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "license_memory" ADD CONSTRAINT "license_memory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "monthly_billing" ADD CONSTRAINT "monthly_billing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_alerts" ADD CONSTRAINT "usage_alerts_setById_fkey" FOREIGN KEY ("setById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_exports" ADD CONSTRAINT "session_exports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shooting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma migrations table (so Prisma knows the schema is in sync)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);
