-- AlterTable
ALTER TABLE "shooting_sessions" ADD COLUMN IF NOT EXISTS "photosExpiresAt" TIMESTAMP(3);
