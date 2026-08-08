require("dotenv").config();
const { query, pool } = require("../src/config/db");

async function seedDemoAccounts() {
  console.log("Seeding Demo Accounts for Play Store & Razorpay Reviewers...");

  try {
    // 1. Seed Customer Demo User (9999999999)
    const existingUser = await query("SELECT id FROM users WHERE phone = $1", ["9999999999"]);
    if (existingUser.rowCount === 0) {
      await query(
        `INSERT INTO users (name, phone, email, address, source)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "PlayStore Reviewer / Test Customer",
          "9999999999",
          "reviewer.customer@panditoo.com",
          "Palasia Square, Indore, MP - 452001",
          "app_review"
        ]
      );
      console.log("✓ Created Customer Demo User: +91 9999999999");
    } else {
      console.log("✓ Customer Demo User (+91 9999999999) already exists.");
    }

    // 2. Seed Pandit Demo Partner (9876543210)
    const existingPandit = await query("SELECT id FROM pandits WHERE phone = $1", ["9876543210"]);
    if (existingPandit.rowCount === 0) {
      await query(
        `INSERT INTO pandits (
          name, phone, email, address, source, specializations, experience_years,
          service_radius_km, latitude, longitude, is_verified, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          "Pandit Rajesh Sharma (Test Partner)",
          "9876543210",
          "reviewer.pandit@panditoo.com",
          "Vijay Nagar, Indore, MP - 452010",
          "app_review",
          ["Satyanarayan Pooja", "Ganesh Pooja", "Griha Pravesh", "Rudrabhishek", "Navgrah Shanti"],
          10,
          25,
          22.7196,
          75.8577,
          true,
          true
        ]
      );
      console.log("✓ Created Pandit Demo Partner: +91 9876543210");
    } else {
      console.log("✓ Pandit Demo Partner (+91 9876543210) already exists.");
    }

  } catch (error) {
    console.error("Error seeding demo accounts:", error);
  } finally {
    await pool.end();
  }
}

seedDemoAccounts();
