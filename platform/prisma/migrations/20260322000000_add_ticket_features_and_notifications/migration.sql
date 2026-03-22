-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ticket_reply', 'ticket_resolved', 'payment_due', 'payment_received', 'session_complete', 'session_failed', 'limit_warning', 'system');

-- AlterTable: TicketMessage add replyToId
ALTER TABLE "ticket_messages" ADD COLUMN "replyToId" TEXT;

-- AlterTable: TicketAttachment add messageId and mimeType
ALTER TABLE "ticket_attachments" ADD COLUMN "messageId" TEXT;
ALTER TABLE "ticket_attachments" ADD COLUMN "mimeType" TEXT;

-- CreateTable: Notification
CREATE TABLE "notifications" (
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

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ticket_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ticket_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
