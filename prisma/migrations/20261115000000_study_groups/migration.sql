CREATE TABLE "StudyGroup" (
    "code" TEXT NOT NULL,
    CONSTRAINT "StudyGroup_pkey" PRIMARY KEY ("code")
);

INSERT INTO "StudyGroup" ("code")
SELECT "group" FROM "StudentProfile"
UNION
SELECT "group" FROM "Lesson";
