CREATE TABLE IF NOT EXISTS pandit_wallets (
  pandit_id UUID PRIMARY KEY REFERENCES pandits(id) ON DELETE CASCADE,
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  lifetime_credited NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (lifetime_credited >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pandit_id UUID NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  bank_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pandit_id UUID NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  withdrawal_request_id UUID REFERENCES withdrawal_requests(id) ON DELETE SET NULL,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('festival_booking_credit','withdrawal_hold','withdrawal_refund')),
  direction VARCHAR(6) NOT NULL CHECK (direction IN ('credit','debit')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_booking_credit_unique ON wallet_transactions (booking_id) WHERE transaction_type='festival_booking_credit';
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_pandit ON wallet_transactions(pandit_id, created_at DESC);
