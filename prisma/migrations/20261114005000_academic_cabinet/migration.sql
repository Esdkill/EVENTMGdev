-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('passed', 'planned', 'retake');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('deadline', 'schedule', 'request', 'news');

-- CreateEnum
CREATE TYPE "AudienceKind" AS ENUM ('all', 'faculty', 'year', 'group', 'student');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "changeReason" TEXT,
ADD COLUMN     "previousEnd" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GradeRecord" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "teacher" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "score" INTEGER,
    "status" "GradeStatus" NOT NULL,
    "attendance" INTEGER,
    "nextAt" TIMESTAMP(3),

    CONSTRAINT "GradeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeCheckpoint" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "maxPoints" INTEGER NOT NULL,

    CONSTRAINT "GradeCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bulletin" (
    "id" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "audience" "AudienceKind" NOT NULL,
    "target" TEXT,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3) NOT NULL,
    "calendarAt" TIMESTAMP(3),
    "href" TEXT,

    CONSTRAINT "Bulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "userId" TEXT NOT NULL,
    "bulletinId" TEXT NOT NULL,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("userId","bulletinId")
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "userId" TEXT NOT NULL,
    "deadlines" BOOLEAN NOT NULL DEFAULT true,
    "schedule" BOOLEAN NOT NULL DEFAULT true,
    "requests" BOOLEAN NOT NULL DEFAULT true,
    "news" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DeanThread" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "ownerId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "staffReadAt" TIMESTAMP(3),

    CONSTRAINT "DeanThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeanMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeanMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeanAttachment" (
    "messageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "content" BYTEA NOT NULL,

    CONSTRAINT "DeanAttachment_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE INDEX "GradeRecord_ownerId_semester_idx" ON "GradeRecord"("ownerId", "semester");

-- CreateIndex
CREATE INDEX "Bulletin_kind_publishAt_idx" ON "Bulletin"("kind", "publishAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeanThread_number_key" ON "DeanThread"("number");

-- CreateIndex
CREATE INDEX "DeanThread_ownerId_updatedAt_idx" ON "DeanThread"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "DeanMessage_threadId_createdAt_idx" ON "DeanMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "GradeRecord" ADD CONSTRAINT "GradeRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeCheckpoint" ADD CONSTRAINT "GradeCheckpoint_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "GradeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "Bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeanThread" ADD CONSTRAINT "DeanThread_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeanMessage" ADD CONSTRAINT "DeanMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DeanThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeanMessage" ADD CONSTRAINT "DeanMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeanAttachment" ADD CONSTRAINT "DeanAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DeanMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

