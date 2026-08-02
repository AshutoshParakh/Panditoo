CREATE TABLE IF NOT EXISTS referral_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL,
  name VARCHAR(150) NOT NULL,
  channel VARCHAR(80) NOT NULL,
  location VARCHAR(180),
  campaign_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (campaign_cost >= 0),
  discount_type VARCHAR(10) CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) CHECK (discount_value IS NULL OR discount_value > 0),
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_discount_amount NUMERIC(10,2) CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((discount_type IS NULL AND discount_value IS NULL) OR (discount_type IS NOT NULL AND discount_value IS NOT NULL)),
  CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS referral_campaigns_code_upper_unique ON referral_campaigns (UPPER(code));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_campaign_id UUID REFERENCES referral_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS referral_campaign_id UUID REFERENCES referral_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS referral_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_referral_campaign ON users(referral_campaign_id);
CREATE INDEX IF NOT EXISTS idx_bookings_referral_campaign ON bookings(referral_campaign_id);

