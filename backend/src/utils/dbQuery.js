const { db } = require("../config/db");

async function executeQuery(sql, params = []) {
  const pool = db.promise();
  return pool.execute(sql, params);
}

async function withTransaction(work) {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  executeQuery,
  withTransaction,
};
