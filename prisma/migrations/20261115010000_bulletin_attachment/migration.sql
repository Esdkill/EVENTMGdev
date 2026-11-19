CREATE TABLE "BulletinAttachment" (
    "bulletinId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "content" BYTEA NOT NULL,

    CONSTRAINT "BulletinAttachment_pkey" PRIMARY KEY ("bulletinId"),
    CONSTRAINT "BulletinAttachment_bulletinId_fkey" FOREIGN KEY ("bulletinId")
        REFERENCES "Bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
