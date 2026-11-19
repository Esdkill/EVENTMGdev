BEGIN;

ALTER TABLE "Lesson" ADD COLUMN "cohort" "BulletinCohort" NOT NULL DEFAULT 'live';

WITH demo_groups AS (
  SELECT profile."group"
  FROM "StudentProfile" AS profile
  JOIN "User" AS account ON account."id" = profile."userId"
  WHERE account."role" = 'student'
  GROUP BY profile."group"
  HAVING bool_and(account."isDemo")
)
UPDATE "Lesson"
SET "cohort" = 'demo'
WHERE "id" IN (
  'anna-economics', 'anna-analysis', 'anna-processes', 'anna-english',
  'anna-economics-tuesday', 'anna-math-wednesday', 'anna-analysis-thursday', 'anna-processes-friday',
  'maxim-databases', 'maxim-econometrics', 'maxim-management'
)
OR "group" IN (SELECT "group" FROM demo_groups);

WITH demo_groups AS (
  SELECT profile."group"
  FROM "StudentProfile" AS profile
  JOIN "User" AS account ON account."id" = profile."userId"
  WHERE account."role" = 'student'
  GROUP BY profile."group"
  HAVING bool_and(account."isDemo")
)
UPDATE "Bulletin" AS bulletin
SET "cohort" = CASE WHEN
  (bulletin."audience" = 'group' AND bulletin."target" IN (SELECT "group" FROM demo_groups))
  OR (bulletin."audience" = 'student' AND EXISTS (
    SELECT 1 FROM "User" AS account WHERE account."id" = bulletin."target" AND account."isDemo"
  ))
  THEN 'demo'::"BulletinCohort" ELSE 'live'::"BulletinCohort" END
WHERE bulletin."kind" = 'schedule' AND bulletin."cohort" IS NULL;

DROP INDEX "Lesson_group_startsAt_idx";
CREATE INDEX "Lesson_group_cohort_startsAt_idx" ON "Lesson"("group", "cohort", "startsAt");

COMMIT;
