ALTER TABLE "ClassSchedule" ALTER COLUMN "trainerId" DROP NOT NULL;
ALTER TABLE "ClassSchedule" DROP CONSTRAINT "ClassSchedule_trainerId_fkey";
ALTER TABLE "ClassSchedule"
  ADD CONSTRAINT "ClassSchedule_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
