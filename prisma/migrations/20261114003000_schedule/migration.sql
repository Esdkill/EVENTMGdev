-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('planned', 'rescheduled', 'cancelled');

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "teacher" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'planned',
    "previousAt" TIMESTAMP(3),
    "previousRoom" TEXT,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lesson_group_startsAt_idx" ON "Lesson"("group", "startsAt");

