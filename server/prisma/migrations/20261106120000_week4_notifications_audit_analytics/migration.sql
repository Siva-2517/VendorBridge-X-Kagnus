-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RFQ_UPDATE', 'APPROVAL_ALERT', 'INVOICE_UPDATE', 'SYSTEM_NOTICE');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "actorName" TEXT,
ADD COLUMN "actorRole" "Role",
ADD COLUMN "category" TEXT,
ADD COLUMN "entityType" TEXT,
ADD COLUMN "entityId" TEXT,
ADD COLUMN "entityIdentifier" TEXT,
ADD COLUMN "metadata" JSONB;

-- Backfill actorName and actorRole from existing User relation where userId is present
UPDATE "AuditLog" a
SET "actorName" = TRIM(CONCAT(u."firstName", ' ', u."lastName")),
    "actorRole" = u."role"
FROM "User" u
WHERE a."userId" = u."id" AND a."actorName" IS NULL;

-- Backfill category and entityType based on existing action naming conventions
UPDATE "AuditLog"
SET "category" = 'RFQ', "entityType" = 'RFQ'
WHERE "category" IS NULL AND ("action" LIKE 'RFQ_%' OR "action" = 'ATTACHMENT_UPLOADED');

UPDATE "AuditLog"
SET "category" = 'APPROVAL', "entityType" = 'APPROVAL'
WHERE "category" IS NULL AND ("action" LIKE 'APPROVAL_%' OR "action" = 'SELECTED_FOR_APPROVAL');

UPDATE "AuditLog"
SET "category" = 'PO', "entityType" = 'PURCHASE_ORDER'
WHERE "category" IS NULL AND "action" LIKE 'PO_%';

UPDATE "AuditLog"
SET "category" = 'INVOICE', "entityType" = 'INVOICE'
WHERE "category" IS NULL AND "action" LIKE 'INVOICE_%';

UPDATE "AuditLog"
SET "category" = 'VENDOR', "entityType" = 'VENDOR'
WHERE "category" IS NULL AND "action" LIKE 'VENDOR_%';

UPDATE "AuditLog"
SET "category" = 'AUTH', "entityType" = 'USER'
WHERE "category" IS NULL AND ("action" LIKE 'USER_%' OR "action" LIKE 'PASSWORD_%' OR "action" LIKE 'PROFILE_%');

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM_NOTICE',
    "entityType" TEXT,
    "entityId" TEXT,
    "entityIdentifier" TEXT,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce Database-Level Immutability on AuditLog
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'AuditLog records are immutable and cannot be deleted.';
    ELSIF TG_OP = 'UPDATE' THEN
        -- Allow foreign key ON DELETE SET NULL when a user is deleted, while preserving all audit details
        IF (OLD."userId" IS NOT NULL AND NEW."userId" IS NULL)
           AND OLD."action" = NEW."action"
           AND (OLD."details" IS NOT DISTINCT FROM NEW."details")
           AND (OLD."actorName" IS NOT DISTINCT FROM NEW."actorName")
           AND (OLD."actorRole" IS NOT DISTINCT FROM NEW."actorRole")
           AND (OLD."category" IS NOT DISTINCT FROM NEW."category")
           AND (OLD."entityType" IS NOT DISTINCT FROM NEW."entityType")
           AND (OLD."entityId" IS NOT DISTINCT FROM NEW."entityId")
           AND (OLD."entityIdentifier" IS NOT DISTINCT FROM NEW."entityIdentifier")
           AND (OLD."metadata" IS NOT DISTINCT FROM NEW."metadata")
           AND OLD."createdAt" = NEW."createdAt" THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'AuditLog records are immutable and cannot be updated.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON "AuditLog";
CREATE TRIGGER trg_prevent_audit_log_mutation
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();
