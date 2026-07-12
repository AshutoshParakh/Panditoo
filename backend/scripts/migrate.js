const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv");

dotenv.config();

const { pool } = require("../src/config/db");

const migrationsDir = path.join(__dirname, "..", "migrations");

const run = async () => {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query("SELECT filename FROM schema_migrations");
    const appliedFiles = new Set(appliedResult.rows.map((row) => row.filename));

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".up.sql"))
      .sort();

    for (const file of migrationFiles) {
      if (appliedFiles.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`Applying migration: ${file}`);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
    }

    console.log("Migrations applied successfully");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_rollbackError) {
      // Ignore rollback failures if BEGIN never ran.
    }
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
