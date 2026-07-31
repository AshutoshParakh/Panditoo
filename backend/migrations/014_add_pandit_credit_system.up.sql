ALTER TABLE pooja_types ADD COLUMN IF NOT EXISTS credit_cost INTEGER NOT NULL DEFAULT 10 CHECK (credit_cost > 0);

CREATE TABLE IF NOT EXISTS pandit_credit_wallets (
  pandit_id UUID PRIMARY KEY REFERENCES pandits(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_purchased >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pandit_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pandit_id UUID NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('signup_bonus','purchase','service_acceptance','admin_adjustment')),
  direction VARCHAR(6) NOT NULL CHECK (direction IN ('credit','debit')),
  credits INTEGER NOT NULL CHECK (credits > 0),
  rupee_amount NUMERIC(10,2),
  description TEXT NOT NULL,
  razorpay_order_id VARCHAR(120),
  razorpay_payment_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_signup_once ON pandit_credit_transactions(pandit_id) WHERE type='signup_bonus';
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_booking_debit_once ON pandit_credit_transactions(booking_id,pandit_id) WHERE type='service_acceptance';
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_purchase_payment_once ON pandit_credit_transactions(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_pandit ON pandit_credit_transactions(pandit_id,created_at DESC);

CREATE TABLE IF NOT EXISTS pandit_credit_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), pandit_id UUID NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL CHECK(credits>0), amount NUMERIC(10,2) NOT NULL CHECK(amount>0),
  razorpay_order_id VARCHAR(120) NOT NULL UNIQUE, status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK(status IN('created','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paid_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION grant_pandit_signup_credits() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pandit_credit_wallets(pandit_id,balance) VALUES(NEW.id,50) ON CONFLICT DO NOTHING;
  INSERT INTO pandit_credit_transactions(pandit_id,type,direction,credits,description)
  VALUES(NEW.id,'signup_bonus','credit',50,'Welcome bonus: 50 free credits') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_pandit_signup_credits ON pandits;
CREATE TRIGGER trg_pandit_signup_credits AFTER INSERT ON pandits FOR EACH ROW EXECUTE FUNCTION grant_pandit_signup_credits();

INSERT INTO pandit_credit_wallets(pandit_id,balance) SELECT id,50 FROM pandits ON CONFLICT DO NOTHING;
INSERT INTO pandit_credit_transactions(pandit_id,type,direction,credits,description)
SELECT id,'signup_bonus','credit',50,'Welcome bonus: 50 free credits' FROM pandits ON CONFLICT DO NOTHING;
