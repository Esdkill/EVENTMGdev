BEGIN;

CREATE TABLE "UserAvatarUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAvatarUpload_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserAvatarUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserAvatarUpload_userId_createdAt_id_idx" ON "UserAvatarUpload"("userId", "createdAt", "id");

ALTER TABLE "UserAvatar" ADD COLUMN "presetId" TEXT, ADD COLUMN "uploadId" TEXT;

-- Existing avatars hold the normalized PNG without selection metadata.
WITH presets(id, digest) AS (VALUES
    ('teal', '41425ce83a87645eafa7cf7995e271c30d92449c006daa4f5cbfe43ba3350ddc'),
    ('coral', 'dda81eb73b04c8a85666219d041b15445cefa9db5959329ae7015cb3e9749f62'),
    ('violet', 'cefd28d858fe2c302c96839e0b1fd04c78a60180ecd7f3eae131ff6dac0c147e'),
    ('gold', 'c5a5caaff27e70e925c1828abc3913f2afc1673c0302250d1bf08a62c830e6f5'),
    ('blue', 'd374d018216160825f4a13ab4c6d31ebaf1c42eed3ed848e0fcff6626bf8356a'),
    ('green', 'ecfd371b00105fa1b4a2acd079e25c931b903a068d145e42dbf7a9a2323182e2'),
    ('rose', '1dec0523b48ae143219c46258931425e418362218cff44210f39be2bd8dd9ab4'),
    ('amber', '3d2ae02b00d886b87d91cf2a191d34aa28962c00c8545b7d6f42b1eec15a3684'),
    ('plum', 'e06a838093fa4d8a1ee46b3922d6011fe83d3f803242b1f9018fdef0c6245c77'),
    ('azure', '796abcaccfb6742c58a7be8bd17d7243240ba8368237ae5e9372e998483e5a0e')
)
UPDATE "UserAvatar" AS avatar SET "presetId" = presets.id
FROM presets WHERE sha256(avatar."content") = decode(presets.digest, 'hex');

WITH uploads AS (
    INSERT INTO "UserAvatarUpload" ("id", "userId", "content", "createdAt")
    SELECT gen_random_uuid()::text, "userId", "content", "updatedAt"
    FROM "UserAvatar" WHERE "presetId" IS NULL
    RETURNING "id", "userId"
)
UPDATE "UserAvatar" AS avatar SET "uploadId" = uploads."id" FROM uploads
WHERE avatar."userId" = uploads."userId";

CREATE UNIQUE INDEX "UserAvatar_uploadId_key" ON "UserAvatar"("uploadId");
ALTER TABLE "UserAvatar" ADD CONSTRAINT "UserAvatar_uploadId_fkey"
    FOREIGN KEY ("uploadId") REFERENCES "UserAvatarUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
