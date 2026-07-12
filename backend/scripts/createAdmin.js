require("dotenv").config();
const bcrypt = require("bcryptjs");
const { query, pool } = require("../src/config/db");

async function createAdmin() {
  const email = "admin@panditoo.com";
  const password = "admin@321";
  const name = "System Superadmin";
  const role = "superadmin";

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if admin already exists
    const existing = await query(
      "SELECT id FROM admins WHERE email = $1",
      [email]
    );

    if (existing.rowCount > 0) {
      // Update
      await query(
        "UPDATE admins SET password_hash = $1, name = $2, role = $3 WHERE email = $4",
        [passwordHash, name, role, email]
      );
      console.log(`Successfully updated admin credentials for ${email}`);
    } else {
      // Insert
      await query(
        "INSERT INTO admins (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        [name, email, passwordHash, role]
      );
      console.log(`Successfully created new admin: ${email}`);
    }
  } catch (error) {
    console.error("Failed to create admin:", error);
  } finally {
    await pool.end();
  }
}

createAdmin();
