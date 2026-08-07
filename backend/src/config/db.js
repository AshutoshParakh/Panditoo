const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const useSsl =
  process.env.PGSSLMODE === "require" ||
  /amazonaws\.com/i.test(connectionString || "");

const pool = new Pool({
  connectionString,
  ssl: useSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

const query = (text, params) => pool.query(text, params);

const testDatabaseConnection = async () => {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
    console.log("PostgreSQL connected");
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  testDatabaseConnection,
};
