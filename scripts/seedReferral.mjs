import dotenv from "dotenv";
dotenv.config({ path: "./backend/.env" });
import { query } from "../backend/src/config/db.js";

async function main() {
  const result = await query(`
    INSERT INTO referral_campaigns (name, partner_name, channel, code, discount_type, discount_value, min_order_amount, commission_percent, is_active)
    VALUES ('Temple Partner QR', 'Mahakal Temple Trust', 'qr_poster', 'MAHAKAL10', 'percent', 10, 500, 5, TRUE)
    ON CONFLICT (code) DO UPDATE SET is_active = TRUE
    RETURNING *
  `);
  console.log("Seeded referral campaign:", result.rows[0]);
  process.exit(0);
}

main().catch(err => {
  console.error("Error seeding referral:", err);
  process.exit(1);
});
