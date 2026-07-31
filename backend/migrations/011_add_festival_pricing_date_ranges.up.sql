ALTER TABLE date_pricing_rules
  ADD COLUMN IF NOT EXISTS pricing_end_date DATE;

UPDATE date_pricing_rules
SET pricing_end_date = pricing_date
WHERE pricing_end_date IS NULL;

ALTER TABLE date_pricing_rules
  ALTER COLUMN pricing_end_date SET NOT NULL;

ALTER TABLE date_pricing_rules
  DROP CONSTRAINT IF EXISTS date_pricing_rules_date_range_check;

ALTER TABLE date_pricing_rules
  ADD CONSTRAINT date_pricing_rules_date_range_check
  CHECK (pricing_end_date >= pricing_date);

CREATE INDEX IF NOT EXISTS idx_date_pricing_rules_range
  ON date_pricing_rules (pricing_date, pricing_end_date)
  WHERE is_active = TRUE;
