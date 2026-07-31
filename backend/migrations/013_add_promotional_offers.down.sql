ALTER TABLE bookings DROP COLUMN IF EXISTS payout_basis_amount, DROP COLUMN IF EXISTS promotional_offer_id;
DROP TABLE IF EXISTS promotional_offer_poojas;
DROP TABLE IF EXISTS promotional_offers;
