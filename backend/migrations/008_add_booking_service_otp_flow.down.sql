DROP INDEX IF EXISTS idx_bookings_service_started_at;
ALTER TABLE bookings
  DROP COLUMN IF EXISTS service_started_at,
  DROP COLUMN IF EXISTS service_completed_at,
  DROP COLUMN IF EXISTS start_otp_hash,
  DROP COLUMN IF EXISTS start_otp_expires_at,
  DROP COLUMN IF EXISTS end_otp_hash,
  DROP COLUMN IF EXISTS end_otp_expires_at;
