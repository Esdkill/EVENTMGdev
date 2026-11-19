CREATE TYPE "AssistantTone" AS ENUM ('friendly', 'formal', 'playful');
CREATE TYPE "AssistantBehavior" AS ENUM ('clarify', 'direct');

ALTER TABLE "AssistantSettings"
ADD COLUMN "tone" "AssistantTone" NOT NULL DEFAULT 'friendly',
ADD COLUMN "behavior" "AssistantBehavior" NOT NULL DEFAULT 'clarify';
