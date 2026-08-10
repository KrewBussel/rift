-- CreateTable
CREATE TABLE "DeletedCrmOpportunity" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedById" TEXT,

    CONSTRAINT "DeletedCrmOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeletedCrmOpportunity_firmId_opportunityId_key" ON "DeletedCrmOpportunity"("firmId", "opportunityId");

-- AddForeignKey
ALTER TABLE "DeletedCrmOpportunity" ADD CONSTRAINT "DeletedCrmOpportunity_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletedCrmOpportunity" ADD CONSTRAINT "DeletedCrmOpportunity_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
