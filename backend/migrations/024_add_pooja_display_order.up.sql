ALTER TABLE pooja_types
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id)::int AS position
  FROM pooja_types
)
UPDATE pooja_types pooja
SET display_order = ordered.position
FROM ordered
WHERE pooja.id = ordered.id
  AND pooja.display_order = 0;

CREATE INDEX IF NOT EXISTS idx_pooja_types_display_order
  ON pooja_types (display_order, created_at DESC);

