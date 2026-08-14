const { Pool, types } = require("pg");

// Parse Postgres DATE (OID 1082) as raw string "YYYY-MM-DD" to prevent UTC timezone shifts
types.setTypeParser(1082, (val) => val);

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
