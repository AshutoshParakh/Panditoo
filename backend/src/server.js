const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const { testDatabaseConnection } = require("./config/db");
const { startScheduler } = require("./services/cronService");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await testDatabaseConnection();
    startScheduler(); // Start the background cron jobs for batch routing and reminders
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
};

startServer();
