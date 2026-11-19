CREATE TABLE "UserAvatar" (
  "userId" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "UserAvatar_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "AssistantSettings" ADD COLUMN "imageModel" TEXT;
