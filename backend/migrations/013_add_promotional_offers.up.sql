CREATE TABLE IF NOT EXISTS promotional_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(240),
  offer_type VARCHAR(20) NOT NULL CHECK (offer_type IN ('percent','fixed_price')),
  offer_value NUMERIC(10,2) NOT NULL CHECK (offer_value > 0),
  applies_to_all BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK (offer_type <> 'percent' OR offer_value <= 100)
);

CREATE TABLE IF NOT EXISTS promotional_offer_poojas (
  offer_id UUID NOT NULL REFERENCES promotional_offers(id) ON DELETE CASCADE,
  pooja_type_id UUID NOT NULL REFERENCES pooja_types(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, pooja_type_id)
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS promotional_offer_id UUID REFERENCES promotional_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_basis_amount NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_promotional_offers_active_dates ON promotional_offers(is_active, starts_at, ends_at);
