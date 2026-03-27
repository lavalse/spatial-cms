-- CreateEnum
CREATE TYPE "GeometryType" AS ENUM ('NONE', 'POINT', 'LINESTRING', 'POLYGON', 'MIXED');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('string', 'number', 'boolean', 'date', 'json', 'enum_', 'relation', 'geometry');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('belongs_to', 'has_many', 'many_to_many');

-- CreateEnum
CREATE TYPE "GovernanceTargetType" AS ENUM ('model', 'dataset');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('manual', 'auto');

-- CreateEnum
CREATE TYPE "PublishMode" AS ENUM ('manual', 'auto');

-- AlterTable: add model_definition_id to entity
ALTER TABLE "entity" ADD COLUMN "model_definition_id" UUID;

-- CreateTable
CREATE TABLE "model_definition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "geometry_type" "GeometryType" NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_definition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_definition_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" "FieldType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "default_value" JSONB,
    "enum_values" JSONB,
    "validation_json" JSONB,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "field_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relation_definition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_model_definition_id" UUID NOT NULL,
    "target_model_definition_id" UUID NOT NULL,
    "relation_type" "RelationType" NOT NULL,
    "key" TEXT NOT NULL,
    "inverse_key" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "relation_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_model_binding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dataset_definition_id" UUID NOT NULL,
    "model_definition_id" UUID NOT NULL,
    "filter_json" JSONB,
    "projection_json" JSONB,

    CONSTRAINT "dataset_model_binding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_policy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_type" "GovernanceTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "require_proposal" BOOLEAN NOT NULL DEFAULT true,
    "approval_mode" "ApprovalMode" NOT NULL DEFAULT 'manual',
    "publish_mode" "PublishMode" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_definition_key_key" ON "model_definition"("key");

-- CreateIndex
CREATE INDEX "field_definition_model_definition_id_idx" ON "field_definition"("model_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_definition_model_definition_id_key_key" ON "field_definition"("model_definition_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "relation_definition_source_model_definition_id_key_key" ON "relation_definition"("source_model_definition_id", "key");

-- CreateIndex
CREATE INDEX "dataset_model_binding_dataset_definition_id_idx" ON "dataset_model_binding"("dataset_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_model_binding_dataset_definition_id_model_definition_key" ON "dataset_model_binding"("dataset_definition_id", "model_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "governance_policy_target_type_target_id_key" ON "governance_policy"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "entity_model_definition_id_idx" ON "entity"("model_definition_id");

-- AddForeignKey
ALTER TABLE "entity" ADD CONSTRAINT "entity_model_definition_id_fkey" FOREIGN KEY ("model_definition_id") REFERENCES "model_definition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_definition" ADD CONSTRAINT "field_definition_model_definition_id_fkey" FOREIGN KEY ("model_definition_id") REFERENCES "model_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relation_definition" ADD CONSTRAINT "relation_definition_source_model_definition_id_fkey" FOREIGN KEY ("source_model_definition_id") REFERENCES "model_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relation_definition" ADD CONSTRAINT "relation_definition_target_model_definition_id_fkey" FOREIGN KEY ("target_model_definition_id") REFERENCES "model_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_model_binding" ADD CONSTRAINT "dataset_model_binding_dataset_definition_id_fkey" FOREIGN KEY ("dataset_definition_id") REFERENCES "dataset_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_model_binding" ADD CONSTRAINT "dataset_model_binding_model_definition_id_fkey" FOREIGN KEY ("model_definition_id") REFERENCES "model_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
