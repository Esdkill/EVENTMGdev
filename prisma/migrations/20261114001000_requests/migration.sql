-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('enrollment', 'military', 'financial_aid', 'academic_record');

-- CreateEnum
CREATE TYPE "RequestDelivery" AS ENUM ('electronic', 'pickup');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'READY', 'ISSUED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "purpose" TEXT NOT NULL,
    "copies" INTEGER NOT NULL,
    "delivery" "RequestDelivery" NOT NULL,
    "comment" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "dueOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 0,
    "submissionKey" TEXT NOT NULL,
    "staffNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "RequestStatus",
    "toStatus" "RequestStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequest_number_key" ON "DocumentRequest"("number");

-- CreateIndex
CREATE INDEX "DocumentRequest_ownerId_createdAt_idx" ON "DocumentRequest"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentRequest_status_createdAt_idx" ON "DocumentRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequest_ownerId_submissionKey_key" ON "DocumentRequest"("ownerId", "submissionKey");

-- CreateIndex
CREATE INDEX "RequestEvent_requestId_createdAt_idx" ON "RequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequestDocument_requestId_key" ON "RequestDocument"("requestId");

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent" ADD CONSTRAINT "RequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent" ADD CONSTRAINT "RequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocument" ADD CONSTRAINT "RequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

