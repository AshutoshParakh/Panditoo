DROP INDEX IF EXISTS idx_booking_service_visits_schedule;
DROP INDEX IF EXISTS idx_booking_service_visits_next;
DROP TABLE IF EXISTS booking_service_visits;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_service_days_positive,
  DROP COLUMN IF EXISTS service_days;

ALTER TABLE pooja_types
  DROP CONSTRAINT IF EXISTS pooja_types_service_days_positive,
  DROP COLUMN IF EXISTS service_days;
