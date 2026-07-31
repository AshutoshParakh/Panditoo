CREATE TABLE IF NOT EXISTS date_credit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_date DATE NOT NULL,
  credit_end_date DATE NOT NULL,
  pooja_type_id UUID REFERENCES pooja_types(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  credit_cost INTEGER NOT NULL CHECK (credit_cost > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (credit_end_date >= credit_date)
);
CREATE INDEX IF NOT EXISTS idx_date_credit_rules_lookup ON date_credit_rules(credit_date,credit_end_date,pooja_type_id) WHERE is_active=TRUE;

CREATE OR REPLACE FUNCTION effective_pooja_credit_cost(target_pooja UUID, target_date DATE) RETURNS INTEGER AS $$
  SELECT COALESCE(
    (SELECT r.credit_cost FROM date_credit_rules r
     WHERE r.is_active=TRUE AND target_date BETWEEN r.credit_date AND r.credit_end_date
       AND (r.pooja_type_id=target_pooja OR r.pooja_type_id IS NULL)
     ORDER BY (r.pooja_type_id IS NOT NULL) DESC,r.created_at DESC LIMIT 1),
    (SELECT p.credit_cost FROM pooja_types p WHERE p.id=target_pooja),10
  );
$$ LANGUAGE SQL STABLE;
