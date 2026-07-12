DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_recipient_type') THEN
    CREATE TYPE notification_recipient_type AS ENUM ('user', 'pandit', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel_type') THEN
    CREATE TYPE notification_channel_type AS ENUM ('push', 'whatsapp');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type notification_recipient_type NOT NULL,
  recipient_id UUID NOT NULL,
  channel notification_channel_type NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_recipient
  ON notifications_log (recipient_type, recipient_id, sent_at DESC);
