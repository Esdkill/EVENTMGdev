CREATE TABLE "AssistantImageSettings" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantImageSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AssistantImageSettings" ("id", "model", "encryptedKey", "updatedAt")
SELECT "id", 'openai/gpt-image-2.6-flare', "encryptedKey", "updatedAt"
FROM "AssistantSettings"
WHERE "id" = 'deanery'
  AND "apiUrl" = 'https://openrouter.ai/api/v1'
  AND "encryptedKey" IS NOT NULL;

ALTER TABLE "AssistantSettings" DROP COLUMN "imageModel";
