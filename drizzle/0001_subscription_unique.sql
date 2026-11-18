-- Remove duplicate rows from earlier redeliveries first (keeps the newest), then enforce one row per Stripe subscription.
DELETE FROM "subscription" a USING "subscription" b WHERE a."subscriptionId" = b."subscriptionId" AND a."createdAt" < b."createdAt";
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_subscriptionId_unique" UNIQUE("subscriptionId");
