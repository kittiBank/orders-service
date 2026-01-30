/*
  Warnings:

  - Added the required column `subtotal` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add columns with default value first
ALTER TABLE "orders" ADD COLUMN "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Update existing rows: set subtotal = total (assuming no shipping fee for old orders)
UPDATE "orders" SET "subtotal" = "total" WHERE "subtotal" = 0;

-- Remove default from subtotal (keep it for shippingFee)
ALTER TABLE "orders" ALTER COLUMN "subtotal" DROP DEFAULT;
