ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_otp_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS start_otp_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_otp_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS end_otp_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_service_started_at ON bookings (service_started_at);
