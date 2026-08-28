ALTER TABLE pooja_types
  ADD COLUMN IF NOT EXISTS service_days INTEGER NOT NULL DEFAULT 1;

ALTER TABLE pooja_types
  DROP CONSTRAINT IF EXISTS pooja_types_service_days_positive;

ALTER TABLE pooja_types
  ADD CONSTRAINT pooja_types_service_days_positive
  CHECK (service_days BETWEEN 1 AND 31);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_days INTEGER NOT NULL DEFAULT 1;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_service_days_positive;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_service_days_positive
  CHECK (service_days BETWEEN 1 AND 31);

CREATE TABLE IF NOT EXISTS booking_service_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  visit_number INTEGER NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  start_otp_hash VARCHAR(64),
  start_otp_expires_at TIMESTAMPTZ,
  end_otp_hash VARCHAR(64),
  end_otp_expires_at TIMESTAMPTZ,
  service_otp_ciphertext TEXT,
  service_otp_phase VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_service_visits_number_positive CHECK (visit_number > 0),
  CONSTRAINT booking_service_visits_phase_check CHECK (service_otp_phase IS NULL OR service_otp_phase IN ('start', 'end')),
  CONSTRAINT booking_service_visits_completion_order CHECK (completed_at IS NULL OR started_at IS NOT NULL),
  CONSTRAINT booking_service_visits_unique_number UNIQUE (booking_id, visit_number),
  CONSTRAINT booking_service_visits_unique_date UNIQUE (booking_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_booking_service_visits_next
  ON booking_service_visits (booking_id, completed_at, visit_number);

CREATE INDEX IF NOT EXISTS idx_booking_service_visits_schedule
  ON booking_service_visits (scheduled_date, scheduled_time);

