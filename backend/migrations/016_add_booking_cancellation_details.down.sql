ALTER TABLE bookings
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS cancellation_note,
  DROP COLUMN IF EXISTS cancellation_reason;
