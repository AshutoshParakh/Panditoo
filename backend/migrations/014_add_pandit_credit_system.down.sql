DROP TRIGGER IF EXISTS trg_pandit_signup_credits ON pandits;
DROP FUNCTION IF EXISTS grant_pandit_signup_credits();
DROP TABLE IF EXISTS pandit_credit_purchase_orders;
DROP TABLE IF EXISTS pandit_credit_transactions;
DROP TABLE IF EXISTS pandit_credit_wallets;
ALTER TABLE pooja_types DROP COLUMN IF EXISTS credit_cost;
