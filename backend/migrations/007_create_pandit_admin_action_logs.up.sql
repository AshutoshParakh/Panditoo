CREATE TABLE IF NOT EXISTS pandit_admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pandit_id UUID NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pandit_admin_action_logs_pandit_created
  ON pandit_admin_action_logs (pandit_id, created_at DESC);
