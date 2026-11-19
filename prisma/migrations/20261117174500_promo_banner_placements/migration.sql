CREATE TYPE "PromoPlacement" AS ENUM ('home', 'news', 'help');

ALTER TABLE "PromoBanner" ADD COLUMN "placements" "PromoPlacement"[] NOT NULL DEFAULT ARRAY['home']::"PromoPlacement"[];
