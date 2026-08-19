const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const { testDatabaseConnection } = require("./config/db");
const { startScheduler } = require("./services/cronService");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await testDatabaseConnection();
    if (process.env.DISABLE_SCHEDULER === "true") {
      console.log("Background scheduler disabled");
    } else {
      startScheduler(); // Start the background cron jobs for batch routing and reminders
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🚀 Backend server running on http://0.0.0.0:${PORT}`);
      console.log(`📲 Mobile apps & web client can connect to http://192.168.1.11:${PORT}/api\n`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
};

startServer();
