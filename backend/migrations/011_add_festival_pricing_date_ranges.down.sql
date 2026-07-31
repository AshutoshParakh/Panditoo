DROP INDEX IF EXISTS idx_date_pricing_rules_range;
ALTER TABLE date_pricing_rules
  DROP CONSTRAINT IF EXISTS date_pricing_rules_date_range_check,
  DROP COLUMN IF EXISTS pricing_end_date;
