ALTER TABLE "PromoBanner" ALTER COLUMN "cohort" DROP NOT NULL;

CREATE INDEX "PromoBanner_published_createdAt_idx" ON "PromoBanner"("published", "createdAt");
DROP INDEX "PromoBanner_cohort_published_createdAt_idx";
