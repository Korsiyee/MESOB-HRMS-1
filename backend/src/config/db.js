const mysql = require("mysql2");
const { requireEnv, getEnv, getIntEnv } = require("./env");

const DB_HOST = requireEnv("DB_HOST");
const DB_USER = requireEnv("DB_USER");
const DB_NAME = requireEnv("DB_NAME");
const DB_PASSWORD = getEnv("DB_PASSWORD", "");
const DB_CONNECTION_LIMIT = getIntEnv("DB_CONNECTION_LIMIT", 10);

// Support mock mode for development when DB_HOST is "mock"
const isMockMode = DB_HOST === "mock";

let db;

if (isMockMode) {
  // Create a mock database connection pool for development
  db = {
    promise: () => ({
      execute: async (sql, params) => {
        // Simulate database responses for development
        return [[], []];
      },
      query: async (sql) => {
        return [[{ ok: 1 }]];
      },
      getConnection: async () => ({
        execute: async (sql, params) => [[], []],
        query: async (sql) => [[{ ok: 1 }]],
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
      }),
    }),
  };
} else {
  db = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: DB_CONNECTION_LIMIT,
    queueLimit: 0,
  });
}

async function checkDatabaseConnection() {
  if (isMockMode) {
    console.log("⚠️  Running in DEVELOPMENT MOCK MODE - no real database");
    return true;
  }

  const promisePool = db.promise();
  const [rows] = await promisePool.query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

module.exports = {
  db,
  checkDatabaseConnection,
  isMockMode,
};
