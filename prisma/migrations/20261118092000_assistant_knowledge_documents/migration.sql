CREATE TABLE "AssistantDocument" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "checksum" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssistantDocument_checksum_key" ON "AssistantDocument"("checksum");

ALTER TABLE "AssistantSource"
ADD COLUMN "documentId" TEXT,
ADD CONSTRAINT "AssistantSource_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "AssistantDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AssistantSource_documentId_idx" ON "AssistantSource"("documentId");
CREATE INDEX "AssistantSource_search_idx" ON "AssistantSource" USING GIN ((
  setweight(to_tsvector('russian', "excerpt"), 'A') ||
  setweight(to_tsvector('russian', "title"), 'B')
));
