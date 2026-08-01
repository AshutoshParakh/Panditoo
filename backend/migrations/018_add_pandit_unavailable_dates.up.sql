CREATE TABLE IF NOT EXISTS pandit_unavailable_dates (
  pandit_id UUID NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
  unavailable_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pandit_id, unavailable_date)
);

CREATE INDEX IF NOT EXISTS idx_pandit_unavailable_dates_date
  ON pandit_unavailable_dates (unavailable_date, pandit_id);
