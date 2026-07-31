CREATE TABLE IF NOT EXISTS marketplace_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  advance_booking_days INTEGER NOT NULL DEFAULT 30 CHECK (advance_booking_days BETWEEN 1 AND 365),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO marketplace_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS booking_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(80) NOT NULL,
  time_value TIME NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO booking_time_slots (label, time_value) VALUES
  ('07:00 AM', '07:00'), ('09:00 AM', '09:00'), ('11:00 AM', '11:00'),
  ('01:00 PM', '13:00'), ('03:00 PM', '15:00'), ('05:00 PM', '17:00')
ON CONFLICT (time_value) DO NOTHING;

CREATE TABLE IF NOT EXISTS date_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_date DATE NOT NULL,
  pooja_type_id UUID REFERENCES pooja_types(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
  list_price NUMERIC(10,2) CHECK (list_price IS NULL OR list_price >= sale_price),
  payment_percent INTEGER NOT NULL DEFAULT 30 CHECK (payment_percent IN (30,100)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_date_pricing_rule_unique
  ON date_pricing_rules (pricing_date, COALESCE(pooja_type_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount_amount NUMERIC(10,2),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK (usage_limit IS NULL OR usage_limit > 0)
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS list_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS payment_percent INTEGER NOT NULL DEFAULT 30;
