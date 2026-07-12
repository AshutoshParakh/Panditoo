-- Migration: Add address and source fields to users and pandits tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE pandits ADD COLUMN IF NOT EXISTS source VARCHAR(100);
