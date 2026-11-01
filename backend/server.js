require("./src/config/env");

const app = require("./src/app");
const { checkDatabaseConnection } = require("./src/config/db");
const {
  startInternalRebuildScheduler,
} = require("./src/services/internalSchedulerService");
const { autoInitDatabase } = require("./scripts/autoInitDb");

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("HR Leave Service API Running");
});

async function startServer() {
  try {
    const dbConnected = await checkDatabaseConnection();
    if (dbConnected) {
      console.log("Database connection verified.");
      
      // Auto-initialize database if empty (for Render deployment)
      if (process.env.NODE_ENV === 'production') {
        console.log("🔍 Checking database initialization...");
        await autoInitDatabase();
      }
    } else {
      console.error("Database connection check failed: returned false");
      // if the connection couldn't be verified we may want to abort
      process.exit(1);
    }
  } catch (error) {
    console.error("Database connection check failed:", error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startInternalRebuildScheduler();
  });
}

startServer();
