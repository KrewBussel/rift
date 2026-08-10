-- AlterTable
ALTER TABLE "CrmConnection" ADD COLUMN     "pipelineId" TEXT,
ADD COLUMN     "pipelineName" TEXT,
ADD COLUMN     "requireRolloverFields" BOOLEAN NOT NULL DEFAULT false;
