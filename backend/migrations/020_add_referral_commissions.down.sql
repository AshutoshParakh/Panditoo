DROP TABLE IF EXISTS referral_commissions;
ALTER TABLE referral_campaigns DROP COLUMN IF EXISTS commission_percent, DROP COLUMN IF EXISTS partner_phone, DROP COLUMN IF EXISTS partner_name;
