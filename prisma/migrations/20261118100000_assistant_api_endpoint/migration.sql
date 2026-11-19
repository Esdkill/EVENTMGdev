CREATE TYPE "AssistantApiProtocol" AS ENUM ('compatible', 'messages');
ALTER TABLE "AssistantSettings"
ADD COLUMN "apiUrl" TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
ADD COLUMN "protocol" "AssistantApiProtocol" NOT NULL DEFAULT 'compatible';
