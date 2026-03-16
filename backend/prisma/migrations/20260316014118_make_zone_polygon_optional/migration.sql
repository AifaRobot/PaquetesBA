/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `is_admin` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_banned` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `contract_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contracts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `document_chunks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lead_activities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leads` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `first_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "PackageSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('STANDARD', 'FRAGILE', 'REFRIGERATED', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('ORDER_CREATED', 'ORDER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'DRIVER_NEARBY', 'FAILED');

-- CreateEnum
CREATE TYPE "ZoneStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "contract_templates" DROP CONSTRAINT "contract_templates_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_template_id_fkey";

-- DropForeignKey
ALTER TABLE "document_chunks" DROP CONSTRAINT "document_chunks_document_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_uploaded_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lead_activities" DROP CONSTRAINT "lead_activities_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lead_activities" DROP CONSTRAINT "lead_activities_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_assigned_user_id_fkey";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "is_admin",
DROP COLUMN "is_banned",
DROP COLUMN "username",
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "fcm_token" TEXT,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- DropTable
DROP TABLE "contract_templates";

-- DropTable
DROP TABLE "contracts";

-- DropTable
DROP TABLE "document_chunks";

-- DropTable
DROP TABLE "documents";

-- DropTable
DROP TABLE "lead_activities";

-- DropTable
DROP TABLE "leads";

-- DropEnum
DROP TYPE "ActivityType";

-- DropEnum
DROP TYPE "ContractStatus";

-- DropEnum
DROP TYPE "DocStatus";

-- DropEnum
DROP TYPE "LeadStage";

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "license_plate" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "zone_id" TEXT,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "current_lat" DOUBLE PRECISION,
    "current_lng" DOUBLE PRECISION,
    "last_location_at" TIMESTAMP(3),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "completed_deliveries" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "street_number" TEXT NOT NULL,
    "apartment" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ZoneStatus" NOT NULL DEFAULT 'ACTIVE',
    "polygon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rates" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "package_size" "PackageSize" NOT NULL,
    "package_type" "PackageType" NOT NULL,
    "base_price" DOUBLE PRECISION NOT NULL,
    "price_per_km" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tracking_code" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "zone_id" TEXT,
    "package_size" "PackageSize" NOT NULL,
    "package_type" "PackageType" NOT NULL,
    "package_description" TEXT,
    "weight_kg" DOUBLE PRECISION,
    "origin_street" TEXT NOT NULL,
    "origin_street_number" TEXT NOT NULL,
    "origin_apartment" TEXT,
    "origin_city" TEXT NOT NULL,
    "origin_lat" DOUBLE PRECISION NOT NULL,
    "origin_lng" DOUBLE PRECISION NOT NULL,
    "origin_contact" TEXT,
    "origin_phone" TEXT,
    "dest_street" TEXT NOT NULL,
    "dest_street_number" TEXT NOT NULL,
    "dest_apartment" TEXT,
    "dest_city" TEXT NOT NULL,
    "dest_lat" DOUBLE PRECISION NOT NULL,
    "dest_lng" DOUBLE PRECISION NOT NULL,
    "dest_contact" TEXT,
    "dest_phone" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "estimated_price" DOUBLE PRECISION,
    "final_price" DOUBLE PRECISION,
    "distance_km" DOUBLE PRECISION,
    "signature_url" TEXT,
    "proof_photo_url" TEXT,
    "delivery_notes" TEXT,
    "failure_reason" TEXT,
    "client_rating" INTEGER,
    "client_review" TEXT,
    "picked_up_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "external_ref" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "type" "NotifType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rates_zone_id_package_size_package_type_key" ON "rates"("zone_id", "package_size", "package_type");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tracking_code_key" ON "orders"("tracking_code");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rates" ADD CONSTRAINT "rates_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
