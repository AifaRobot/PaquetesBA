/*
  Warnings:

  - You are about to drop the `characters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `characters_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tags` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'STAGE_CHANGE');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'SIGNED');

-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_users_id_fkey";

-- DropForeignKey
ALTER TABLE "characters_tags" DROP CONSTRAINT "characters_tags_characters_id_fkey";

-- DropForeignKey
ALTER TABLE "characters_tags" DROP CONSTRAINT "characters_tags_tags_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_characters_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_users_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_characters_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_users_id_fkey";

-- DropTable
DROP TABLE "characters";

-- DropTable
DROP TABLE "characters_tags";

-- DropTable
DROP TABLE "comments";

-- DropTable
DROP TABLE "messages";

-- DropTable
DROP TABLE "tags";

-- DropEnum
DROP TYPE "MessageRole";

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "score" DOUBLE PRECISION,
    "score_reason" TEXT,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "assigned_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "type" "ActivityType" NOT NULL,
    "content" TEXT NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_url" TEXT NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "template_id" INTEGER,
    "pdf_url" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "generated_content" TEXT,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
