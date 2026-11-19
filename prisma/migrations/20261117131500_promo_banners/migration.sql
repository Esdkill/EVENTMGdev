CREATE TABLE "PromoBanner" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "cohort" "BulletinCohort" NOT NULL,
  "image" BYTEA NOT NULL,
  "mime" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromoBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PromoBanner_cohort_published_createdAt_idx" ON "PromoBanner"("cohort", "published", "createdAt");
