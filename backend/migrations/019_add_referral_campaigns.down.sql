ALTER TABLE bookings DROP COLUMN IF EXISTS referral_discount_amount, DROP COLUMN IF EXISTS referral_code, DROP COLUMN IF EXISTS referral_campaign_id;
ALTER TABLE users DROP COLUMN IF EXISTS referred_at, DROP COLUMN IF EXISTS referral_code, DROP COLUMN IF EXISTS referral_campaign_id;
DROP TABLE IF EXISTS referral_campaigns;

