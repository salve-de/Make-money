-- Newsletter double opt-in. A subscriber receives mail only after the owner of the
-- address opened the confirmation link. confirmed_at IS NULL means "pending".
-- Existing rows are deliberately NOT marked confirmed: nobody verified those addresses.
-- (status keeps its old CHECK; SQLite cannot alter it, so confirmation is a separate column.)
ALTER TABLE newsletter_subscribers ADD COLUMN confirmed_at TEXT;
