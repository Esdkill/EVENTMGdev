CREATE TYPE "BulletinPublication" AS ENUM ('published', 'draft', 'hidden');
ALTER TABLE "Bulletin" ADD COLUMN "publication" "BulletinPublication" NOT NULL DEFAULT 'published',
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
