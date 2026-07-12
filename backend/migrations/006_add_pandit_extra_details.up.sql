-- Migration: Add extra details columns to pandits table
ALTER TABLE pandits ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE pandits ADD COLUMN IF NOT EXISTS id_proof_url TEXT;
