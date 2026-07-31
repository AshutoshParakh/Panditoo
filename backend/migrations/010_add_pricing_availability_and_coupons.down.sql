ALTER TABLE bookings DROP COLUMN IF EXISTS payment_percent, DROP COLUMN IF EXISTS coupon_code,
  DROP COLUMN IF EXISTS coupon_id, DROP COLUMN IF EXISTS discount_amount, DROP COLUMN IF EXISTS list_price;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS date_pricing_rules;
DROP TABLE IF EXISTS booking_time_slots;
DROP TABLE IF EXISTS marketplace_settings;
