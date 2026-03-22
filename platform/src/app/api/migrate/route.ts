import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Temporary migration endpoint - protected by secret token
// DELETE THIS FILE after running the migration once
const MIGRATE_SECRET = 'zuiki-migrate-2026-run'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  const results: string[] = []

  try {
    // 1. Create NotificationType enum
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "NotificationType" AS ENUM (
          'ticket_reply', 'ticket_resolved', 'payment_due', 'payment_received',
          'session_complete', 'session_failed', 'limit_warning', 'system'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `)
    results.push('NotificationType enum: OK')

    // 2. Add replyToId to ticket_messages
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ticket_messages" ADD COLUMN IF NOT EXISTS "replyToId" TEXT;
    `)
    results.push('ticket_messages.replyToId: OK')

    // 3. Add messageId and mimeType to ticket_attachments
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ticket_attachments" ADD COLUMN IF NOT EXISTS "messageId" TEXT;
    `)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ticket_attachments" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
    `)
    results.push('ticket_attachments.messageId + mimeType: OK')

    // 4. Create notifications table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" "NotificationType" NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT,
        "link" TEXT,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
      );
    `)
    results.push('notifications table: OK')

    // 5. Add foreign keys (ignore if exist)
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_replyToId_fkey"
          FOREIGN KEY ("replyToId") REFERENCES "ticket_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `)
    results.push('FK ticket_messages.replyToId: OK')

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_messageId_fkey"
          FOREIGN KEY ("messageId") REFERENCES "ticket_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `)
    results.push('FK ticket_attachments.messageId: OK')

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `)
    results.push('FK notifications.userId: OK')

    // 6. Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notifications_userId_read_idx" ON "notifications"("userId", "read");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
    `)
    results.push('Indexes: OK')

    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, results }, { status: 500 })
  }
}
