BEGIN;

ALTER TABLE "StudentProfile" ADD COLUMN "recordBookNumber" TEXT;

UPDATE "StudentProfile"
SET "studentNumber" = upper(btrim("studentNumber"))
WHERE "studentNumber" IS DISTINCT FROM upper(btrim("studentNumber"));

ALTER TABLE "StudentProfile"
    ADD CONSTRAINT "StudentProfile_studentNumber_format_check"
        CHECK ("studentNumber" COLLATE "C" ~ '^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9-]{5,23}$'),
    ADD CONSTRAINT "StudentProfile_recordBookNumber_format_check"
        CHECK ("recordBookNumber" COLLATE "C" ~ '^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9-]{0,23}$');

CREATE UNIQUE INDEX "StudentProfile_recordBookNumber_key" ON "StudentProfile"("recordBookNumber");

COMMIT;
