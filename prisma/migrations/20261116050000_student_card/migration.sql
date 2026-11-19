ALTER TABLE "StudentProfile"
  ADD COLUMN "studentNumber" TEXT,
  ADD COLUMN "recoveryFailures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recoveryWindowStartedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "StudentProfile_studentNumber_key" ON "StudentProfile"("studentNumber");
