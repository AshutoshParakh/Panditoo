ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_service_otp_phase_check,
  DROP COLUMN IF EXISTS service_otp_ciphertext,
  DROP COLUMN IF EXISTS service_otp_phase;
