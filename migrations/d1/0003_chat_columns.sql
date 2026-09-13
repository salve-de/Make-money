-- Remove unrelated legacy billing columns accidentally included in chat_messages by 0001.
-- Preserve 0001 as applied migration history. Billing data belongs to users/payment_events.
ALTER TABLE chat_messages DROP COLUMN stripe_customer_id;
ALTER TABLE chat_messages DROP COLUMN stripe_subscription_id;
ALTER TABLE chat_messages DROP COLUMN legacy_is_pro;
ALTER TABLE chat_messages DROP COLUMN pro_expires_at;
