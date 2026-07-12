ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flagged_for_manual_intervention BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  actions_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT
);
