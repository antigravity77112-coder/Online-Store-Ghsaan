-- Default marketing channel ON for new preference rows (customer can opt out in app settings).
ALTER TABLE "NotificationPreference" ALTER COLUMN "marketingEnabled" SET DEFAULT true;
