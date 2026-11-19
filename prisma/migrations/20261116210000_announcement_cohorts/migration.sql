ALTER TABLE "User" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" SET "isDemo" = true
WHERE ("role", "username", "email") IN (
  ('student', 'anna', 'anna@deanery.example'),
  ('student', 'maxim', 'maxim@deanery.example'),
  ('staff', 'irina', 'irina@deanery.example')
);

CREATE TYPE "BulletinCohort" AS ENUM ('demo', 'live');
ALTER TABLE "Bulletin" ADD COLUMN "cohort" "BulletinCohort";

-- Announcements created before audience separation belong to the demo data.
UPDATE "Bulletin" SET "cohort" = 'demo' WHERE "kind" = 'news';

ALTER TYPE "AudienceKind" ADD VALUE 'everyone';
ALTER TYPE "AudienceKind" ADD VALUE 'staff';
