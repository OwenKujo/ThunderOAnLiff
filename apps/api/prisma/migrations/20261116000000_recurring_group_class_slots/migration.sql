ALTER TABLE "ClassSchedule" ADD COLUMN "scheduleKey" TEXT;
CREATE UNIQUE INDEX "ClassSchedule_scheduleKey_key" ON "ClassSchedule"("scheduleKey");
