const { db } = require('../src/config/db');

/**
 * Auto-initialize database for Render deployment
 * Checks if initialized, logs message if not
 */
async function autoInitDatabase() {
  console.log('🚀 Checking database initialization status...');
  
  const promisePool = db.promise();
  
  try {
    // Check if database is already initialized by looking for Users table
    const [tables] = await promisePool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tables && tables.length > 0) {
      console.log('✅ Database already initialized.');
      return true;
    }
    
    console.log('⚠️  Database is EMPTY and needs initialization.');
    console.log('⚠️  Please run database initialization manually:');
    console.log('⚠️  1. Go to backend service on Render dashboard');
    console.log('⚠️  2. Click "Shell" tab');
    console.log('⚠️  3. Run: cd backend && npm run db:init');
    console.log('⚠️  Server will continue running but login will fail until database is initialized.');
    
    return false;
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  }
}

module.exports = { autoInitDatabase };
