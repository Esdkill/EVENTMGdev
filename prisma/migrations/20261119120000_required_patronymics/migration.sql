BEGIN;

ALTER TABLE "User" ADD COLUMN "staffPatronymic" TEXT;

-- Recover patronymics already recorded in the full names of existing accounts.
CREATE TEMP TABLE legacy_patronymics ON COMMIT DROP AS
SELECT id, CASE
  WHEN cardinality(parts) < 3 THEN NULL
  WHEN parts[2] ~* '(ович|евич|ич|овна|евна|ична|инична)$' THEN parts[2]
  ELSE array_to_string(parts[3:], ' ')
END AS patronymic
FROM (
  SELECT id, regexp_split_to_array(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '[[:space:]]+') AS parts
  FROM "User"
) AS names;

UPDATE "StudentProfile" AS profile
SET patronymic = legacy.patronymic
FROM legacy_patronymics AS legacy
WHERE profile."userId" = legacy.id AND coalesce(profile.patronymic, '') !~ '[^[:space:]]';

UPDATE "User" AS employee
SET "staffPatronymic" = legacy.patronymic
FROM legacy_patronymics AS legacy
WHERE employee.id = legacy.id AND employee.role = 'staff';

ALTER TABLE "StudentProfile"
  ALTER COLUMN patronymic SET NOT NULL,
  ADD CONSTRAINT "StudentProfile_patronymic_nonblank_check"
    CHECK (patronymic ~ '[^[:space:]]');

ALTER TABLE "User"
  ADD CONSTRAINT "User_staff_patronymic_required_check"
    CHECK (role <> 'staff' OR coalesce("staffPatronymic", '') ~ '[^[:space:]]');

COMMIT;
