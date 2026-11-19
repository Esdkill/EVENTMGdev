CREATE TABLE "AssistantSettings" (
  "id" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "encryptedKey" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantSource" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantSource_pkey" PRIMARY KEY ("id")
);
