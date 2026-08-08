DROP TABLE IF EXISTS policy_acceptances;
ALTER TABLE users DROP COLUMN IF EXISTS terms_version, DROP COLUMN IF EXISTS privacy_version, DROP COLUMN IF EXISTS policies_accepted_at;
ALTER TABLE pandits DROP COLUMN IF EXISTS terms_version, DROP COLUMN IF EXISTS privacy_version, DROP COLUMN IF EXISTS policies_accepted_at;
