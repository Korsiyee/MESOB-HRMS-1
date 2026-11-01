const mysql = require("mysql2");
const { requireEnv, getEnv, getIntEnv } = require("./env");

// Check if DATABASE_URL exists (PostgreSQL on Render)
const DATABASE_URL = getEnv("DATABASE_URL", "");
const DB_HOST = getEnv("DB_HOST", "");
const DB_USER = getEnv("DB_USER", "");
const DB_NAME = getEnv("DB_NAME", "");
const DB_PASSWORD = getEnv("DB_PASSWORD", "");
const DB_PORT = getIntEnv("DB_PORT", 3306);
const DB_CONNECTION_LIMIT = getIntEnv("DB_CONNECTION_LIMIT", 10);

// Support mock mode for development when DB_HOST is "mock"
const isMockMode = DB_HOST === "mock";

// Detect database type
const isPostgreSQL = DATABASE_URL.startsWith("postgresql://") || DATABASE_URL.startsWith("postgres://");

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
} else if (isPostgreSQL) {
  // Use PostgreSQL (for Render deployment)
  const { Pool } = require("pg");
  
  const pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Wrap PostgreSQL to match MySQL2 interface
  db = {
    promise: () => ({
      execute: async (sql, params) => {
        // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
        let pgSql = sql;
        let paramIndex = 1;
        pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
        
        const result = await pgPool.query(pgSql, params);
        return [result.rows, result.fields];
      },
      query: async (sql, params) => {
        // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
        let pgSql = sql;
        if (params && params.length > 0) {
          let paramIndex = 1;
          pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
        }
        
        const result = await pgPool.query(pgSql, params);
        return [result.rows, result.fields];
      },
      getConnection: async () => {
        const client = await pgPool.connect();
        return {
          execute: async (sql, params) => {
            // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
            let pgSql = sql;
            let paramIndex = 1;
            pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
            
            const result = await client.query(pgSql, params);
            return [result.rows, result.fields];
          },
          query: async (sql, params) => {
            // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
            let pgSql = sql;
            if (params && params.length > 0) {
              let paramIndex = 1;
              pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
            }
            
            const result = await client.query(pgSql, params);
            return [result.rows, result.fields];
          },
          beginTransaction: async () => await client.query('BEGIN'),
          commit: async () => await client.query('COMMIT'),
          rollback: async () => await client.query('ROLLBACK'),
          release: () => client.release(),
        };
      },
    }),
  };
  
  console.log("✅ Using PostgreSQL database");
} else {
  // Use MySQL (for local XAMPP)
  db = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: DB_CONNECTION_LIMIT,
    queueLimit: 0,
  });
  
  console.log("✅ Using MySQL database");
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
