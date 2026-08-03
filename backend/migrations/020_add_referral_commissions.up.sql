ALTER TABLE referral_campaigns
  ADD COLUMN IF NOT EXISTS partner_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS partner_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) NOT NULL DEFAULT 3
    CHECK (commission_percent >= 0 AND commission_percent <= 100);

CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_campaign_id UUID NOT NULL REFERENCES referral_campaigns(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  commission_percent NUMERIC(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  eligible_amount NUMERIC(10,2) NOT NULL CHECK (eligible_amount >= 0),
  commission_amount NUMERIC(10,2) NOT NULL CHECK (commission_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_campaign ON referral_commissions(referral_campaign_id, created_at DESC);
