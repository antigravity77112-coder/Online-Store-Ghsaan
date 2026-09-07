-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('orders', 'engagement', 'marketing', 'system');

-- CreateEnum
CREATE TYPE "NotificationCampaignAudience" AS ENUM ('all_customers', 'admins');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "channel" "NotificationChannel" NOT NULL DEFAULT 'orders';

-- CreateIndex
CREATE INDEX "Notification_channel_createdAt_idx" ON "Notification"("channel", "createdAt" DESC);

-- CreateTable
CREATE TABLE "NotificationCampaign" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "channel" "NotificationChannel" NOT NULL,
    "audience" "NotificationCampaignAudience" NOT NULL,
    "createdById" UUID NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationCampaign_createdAt_idx" ON "NotificationCampaign"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "NotificationCampaign" ADD CONSTRAINT "NotificationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
