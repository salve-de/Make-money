-- Link newsletter records to an authenticated owner when available and give
-- anonymous subscribers a one-time bearer token for deletion.
ALTER TABLE newsletter_subscribers ADD COLUMN user_id TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN unsubscribe_token_hash TEXT;
CREATE INDEX IF NOT EXISTS newsletter_subscribers_owner ON newsletter_subscribers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_unsubscribe_token
  ON newsletter_subscribers(unsubscribe_token_hash)
  WHERE unsubscribe_token_hash IS NOT NULL;
