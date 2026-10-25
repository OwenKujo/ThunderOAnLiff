-- Baseline schema from the pilot project before the Phase 1 hardening refactor.
-- For a fresh database, this migration is followed by 20261025100000_phase1_modularization.

CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED');
CREATE TYPE "PackageType" AS ENUM ('PERSONAL_TRAINING', 'MONTHLY_UNLIMITED', 'TEN_SESSIONS', 'CUSTOM');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'CANCELLED', 'CHECKED_IN', 'ATTENDED', 'NO_SHOW', 'COMPLETED');
CREATE TYPE "AttendanceStatus" AS ENUM ('CHECKED_IN', 'ATTENDED', 'NO_SHOW', 'CANCELLED');
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMATION', 'BOOKING_CANCELLATION', 'CHECK_IN', 'PAYMENT', 'REMINDER');
CREATE TYPE "NotificationChannel" AS ENUM ('LINE_OA', 'LINE_LIFF', 'EMAIL');
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MANAGER');

CREATE TABLE "Trainee" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "lineUserId" TEXT,
  "memberStatus" "MemberStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Trainee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LineAccount" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "lineUserId" TEXT NOT NULL,
  "displayName" TEXT,
  "pictureUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LineAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Package" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PackageType" NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "sessionCount" INTEGER,
  "durationDays" INTEGER,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PackageEntitlement" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "remainingSessions" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PackageEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentRecord" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "packageId" TEXT,
  "entitlementId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paymentReference" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Trainer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "specialty" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassSchedule" (
  "id" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 12,
  "status" TEXT NOT NULL DEFAULT 'open',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "classScheduleId" TEXT NOT NULL,
  "entitlementId" TEXT,
  "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
  "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditLedger" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "bookingId" TEXT,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "classScheduleId" TEXT NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'CHECKED_IN',
  "checkedInAt" TIMESTAMP(3),
  "attendedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT,
  "bookingId" TEXT,
  "type" "NotificationType" NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "payload" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT,
  "adminUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Trainee_email_key" ON "Trainee"("email");
CREATE UNIQUE INDEX "Trainee_lineUserId_key" ON "Trainee"("lineUserId");
CREATE INDEX "Trainee_memberStatus_idx" ON "Trainee"("memberStatus");
CREATE UNIQUE INDEX "LineAccount_lineUserId_key" ON "LineAccount"("lineUserId");
CREATE INDEX "LineAccount_traineeId_idx" ON "LineAccount"("traineeId");
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE INDEX "PackageEntitlement_traineeId_idx" ON "PackageEntitlement"("traineeId");
CREATE INDEX "PackageEntitlement_packageId_idx" ON "PackageEntitlement"("packageId");
CREATE INDEX "PaymentRecord_traineeId_idx" ON "PaymentRecord"("traineeId");
CREATE INDEX "PaymentRecord_status_idx" ON "PaymentRecord"("status");
CREATE INDEX "ClassSchedule_trainerId_idx" ON "ClassSchedule"("trainerId");
CREATE INDEX "ClassSchedule_startAt_idx" ON "ClassSchedule"("startAt");
CREATE INDEX "Booking_traineeId_idx" ON "Booking"("traineeId");
CREATE INDEX "Booking_classScheduleId_idx" ON "Booking"("classScheduleId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "CreditLedger_traineeId_idx" ON "CreditLedger"("traineeId");
CREATE INDEX "CreditLedger_bookingId_idx" ON "CreditLedger"("bookingId");
CREATE UNIQUE INDEX "Attendance_bookingId_key" ON "Attendance"("bookingId");
CREATE INDEX "Attendance_traineeId_idx" ON "Attendance"("traineeId");
CREATE INDEX "Attendance_classScheduleId_idx" ON "Attendance"("classScheduleId");
CREATE INDEX "NotificationLog_traineeId_idx" ON "NotificationLog"("traineeId");
CREATE INDEX "NotificationLog_bookingId_idx" ON "NotificationLog"("bookingId");
CREATE INDEX "AuditLog_traineeId_idx" ON "AuditLog"("traineeId");
CREATE INDEX "AuditLog_adminUserId_idx" ON "AuditLog"("adminUserId");

ALTER TABLE "LineAccount" ADD CONSTRAINT "LineAccount_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageEntitlement" ADD CONSTRAINT "PackageEntitlement_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageEntitlement" ADD CONSTRAINT "PackageEntitlement_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "PackageEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_classScheduleId_fkey" FOREIGN KEY ("classScheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "PackageEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classScheduleId_fkey" FOREIGN KEY ("classScheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
