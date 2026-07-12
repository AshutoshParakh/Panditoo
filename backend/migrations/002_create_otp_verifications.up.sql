DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_actor_type') THEN
    CREATE TYPE otp_actor_type AS ENUM ('user', 'pandit');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  actor_type otp_actor_type NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  CONSTRAINT otp_verifications_phone_otp_length CHECK (char_length(otp) = 6)
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone_actor_created_at
  ON otp_verifications (phone, actor_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone_actor_expires_at
  ON otp_verifications (phone, actor_type, expires_at DESC);
