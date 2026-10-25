-- Hardening/migration changes for the first operational Phase 1 implementation.
-- Converts string class statuses to an enum, models unlimited entitlements explicitly,
-- adds one-time LINE linking codes, an auditable credit ledger, and notification errors.

CREATE TYPE "ClassStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
ALTER TABLE "ClassSchedule" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ClassSchedule"
  ALTER COLUMN "status" TYPE "ClassStatus"
  USING (
    CASE LOWER("status")
      WHEN 'open' THEN 'OPEN'
      WHEN 'closed' THEN 'CLOSED'
      WHEN 'cancelled' THEN 'CANCELLED'
      ELSE 'CLOSED'
    END
  )::"ClassStatus";
ALTER TABLE "ClassSchedule" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Null means an unlimited package. Convert existing monthly unlimited balances before applying this rule.
ALTER TABLE "PackageEntitlement" ALTER COLUMN "remainingSessions" DROP NOT NULL;
ALTER TABLE "PackageEntitlement" ALTER COLUMN "remainingSessions" DROP DEFAULT;
UPDATE "PackageEntitlement" AS entitlement
SET "remainingSessions" = NULL
FROM "Package" AS package
WHERE package."id" = entitlement."packageId"
  AND package."type" = 'MONTHLY_UNLIMITED';

CREATE TABLE "TraineeLinkCode" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TraineeLinkCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TraineeLinkCode_codeHash_key" ON "TraineeLinkCode"("codeHash");
CREATE INDEX "TraineeLinkCode_traineeId_expiresAt_idx" ON "TraineeLinkCode"("traineeId", "expiresAt");
ALTER TABLE "TraineeLinkCode" ADD CONSTRAINT "TraineeLinkCode_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditLedger" ADD COLUMN "entitlementId" TEXT;
ALTER TABLE "CreditLedger" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "PackageEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "CreditLedger_idempotencyKey_key" ON "CreditLedger"("idempotencyKey");
CREATE INDEX "CreditLedger_traineeId_createdAt_idx" ON "CreditLedger"("traineeId", "createdAt");
CREATE INDEX "CreditLedger_entitlementId_idx" ON "CreditLedger"("entitlementId");
DROP INDEX "CreditLedger_traineeId_idx";

ALTER TABLE "NotificationLog" ADD COLUMN "error" TEXT;

-- Replace low-selectivity single-column indexes with indexes aligned to actual queries.
DROP INDEX "Trainee_memberStatus_idx";
CREATE INDEX "Trainee_memberStatus_createdAt_idx" ON "Trainee"("memberStatus", "createdAt");
CREATE INDEX "Trainee_lastName_firstName_idx" ON "Trainee"("lastName", "firstName");

CREATE INDEX "Package_isActive_type_idx" ON "Package"("isActive", "type");
DROP INDEX "PackageEntitlement_traineeId_idx";
CREATE INDEX "PackageEntitlement_traineeId_isActive_endDate_idx" ON "PackageEntitlement"("traineeId", "isActive", "endDate");

DROP INDEX "PaymentRecord_traineeId_idx";
DROP INDEX "PaymentRecord_status_idx";
CREATE INDEX "PaymentRecord_traineeId_status_idx" ON "PaymentRecord"("traineeId", "status");
CREATE INDEX "PaymentRecord_status_createdAt_idx" ON "PaymentRecord"("status", "createdAt");

CREATE INDEX "Trainer_isActive_name_idx" ON "Trainer"("isActive", "name");
DROP INDEX "ClassSchedule_trainerId_idx";
DROP INDEX "ClassSchedule_startAt_idx";
CREATE INDEX "ClassSchedule_trainerId_startAt_idx" ON "ClassSchedule"("trainerId", "startAt");
CREATE INDEX "ClassSchedule_status_startAt_idx" ON "ClassSchedule"("status", "startAt");

DROP INDEX "Booking_traineeId_idx";
DROP INDEX "Booking_classScheduleId_idx";
DROP INDEX "Booking_status_idx";
CREATE INDEX "Booking_traineeId_status_bookedAt_idx" ON "Booking"("traineeId", "status", "bookedAt");
CREATE INDEX "Booking_classScheduleId_status_idx" ON "Booking"("classScheduleId", "status");
CREATE INDEX "Booking_entitlementId_idx" ON "Booking"("entitlementId");

DROP INDEX "Attendance_traineeId_idx";
DROP INDEX "Attendance_classScheduleId_idx";
CREATE INDEX "Attendance_traineeId_status_idx" ON "Attendance"("traineeId", "status");
CREATE INDEX "Attendance_classScheduleId_status_idx" ON "Attendance"("classScheduleId", "status");

DROP INDEX "NotificationLog_traineeId_idx";
CREATE INDEX "NotificationLog_traineeId_createdAt_idx" ON "NotificationLog"("traineeId", "createdAt");
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");

DROP INDEX "AuditLog_traineeId_idx";
DROP INDEX "AuditLog_adminUserId_idx";
CREATE INDEX "AuditLog_traineeId_createdAt_idx" ON "AuditLog"("traineeId", "createdAt");
CREATE INDEX "AuditLog_adminUserId_createdAt_idx" ON "AuditLog"("adminUserId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
