CREATE TABLE IF NOT EXISTS customer_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  platform VARCHAR(30) NOT NULL DEFAULT 'web',
  event_type VARCHAR(50) NOT NULL,
  page_path VARCHAR(255),
  pooja_id UUID REFERENCES pooja_types(id) ON DELETE SET NULL,
  pooja_name VARCHAR(255),
  dropoff_stage VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_session ON customer_journey_events(session_id);
CREATE INDEX IF NOT EXISTS idx_journey_created ON customer_journey_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journey_event_type ON customer_journey_events(event_type);
CREATE INDEX IF NOT EXISTS idx_journey_user_id ON customer_journey_events(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_dropoff ON customer_journey_events(dropoff_stage);
