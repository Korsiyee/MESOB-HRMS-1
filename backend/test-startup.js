// Quick startup test
console.log('Testing server startup...');

try {
  require('./src/routes/permitRoutes');
  console.log('✅ permitRoutes loads successfully');
} catch (err) {
  console.error('❌ Error loading permitRoutes:', err.message);
  console.error(err.stack);
  process.exit(1);
}

try {
  require('./src/controllers/permitController');
  console.log('✅ permitController loads successfully');
} catch (err) {
  console.error('❌ Error loading permitController:', err.message);
  console.error(err.stack);
  process.exit(1);
}

console.log('\n✅ All modules load successfully!');
console.log('Now try: npm run dev');
