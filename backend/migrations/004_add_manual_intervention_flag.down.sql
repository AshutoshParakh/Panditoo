ALTER TABLE bookings DROP COLUMN IF EXISTS flagged_for_manual_intervention;
DROP TABLE IF EXISTS cron_logs;
