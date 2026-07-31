ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_otp_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS service_otp_phase VARCHAR(10);

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_service_otp_phase_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_service_otp_phase_check
  CHECK (service_otp_phase IS NULL OR service_otp_phase IN ('start', 'end'));
