ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS policies_accepted_at TIMESTAMPTZ;

ALTER TABLE pandits
  ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS policies_accepted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS policy_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(10) NOT NULL CHECK (actor_type IN ('user', 'pandit')),
  actor_id UUID NOT NULL,
  terms_version VARCHAR(20) NOT NULL,
  privacy_version VARCHAR(20) NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT policy_acceptances_unique UNIQUE (actor_type, actor_id, terms_version, privacy_version)
);

CREATE INDEX IF NOT EXISTS idx_policy_acceptances_actor ON policy_acceptances (actor_type, actor_id);
