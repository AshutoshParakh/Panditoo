CREATE INDEX IF NOT EXISTS idx_bookings_pandit_schedule
  ON bookings (confirmed_pandit_id, booking_date, booking_time, status);

CREATE INDEX IF NOT EXISTS idx_booking_requests_pandit_created
  ON booking_requests (pandit_id, created_at DESC);
