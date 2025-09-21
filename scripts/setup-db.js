const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🎵 Hum It Out - Database Setup');
  console.log('==============================');

  // Check if database URL is configured
  const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('username:password')) {
    console.log('❌ Database URL not configured in .env file');
    console.log('');
    console.log('Please add your Neon database URL to .env:');
    console.log('NEON_DATABASE_URL=postgresql://your-actual-neon-url');
    console.log('');
    console.log('Get your Neon URL from: https://neon.tech');
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection first
    console.log('🔌 Testing database connection...');
    const testResult = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful!');
    console.log(`   Server time: ${testResult.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${testResult.rows[0].pg_version.split(' ')[0]} ${testResult.rows[0].pg_version.split(' ')[1]}`);
    console.log('');

    // Read and execute schema
    console.log('📋 Creating database schema...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found at: ' + schemaPath);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema (wrapped in transaction)
    await pool.query('BEGIN');
    await pool.query(schema);
    await pool.query('COMMIT');
    
    console.log('✅ Database schema created successfully');
    console.log('');

    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`✅ Created ${tables.length} tables:`);
    tables.forEach(table => console.log(`   • ${table}`));
    console.log('');

    // Check demo users
    const usersResult = await pool.query('SELECT COUNT(*) as user_count, email FROM users GROUP BY email');
    console.log(`📊 Demo users ready: ${usersResult.rows.length} users`);
    usersResult.rows.forEach(user => console.log(`   • ${user.email}`));
    console.log('');

    // Get demo user PINs for easy testing
    const pinsResult = await pool.query('SELECT email, pin FROM users ORDER BY created_at');
    if (pinsResult.rows.length > 0) {
      console.log('🔑 Demo PINs for testing:');
      pinsResult.rows.forEach(user => console.log(`   • ${user.email}: ${user.pin}`));
      console.log('');
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. npm run dev        # Start development servers');
    console.log('2. npm run tunnel     # Start ngrok tunnel (in new terminal)');
    console.log('3. Configure Twilio webhook with ngrok URL');
    console.log('4. Call your Twilio number and test!');
    
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Check your NEON_DATABASE_URL in .env');
    console.log('2. Ensure your Neon database is active');
    console.log('3. Verify network connectivity');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle script errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

setupDatabase();
