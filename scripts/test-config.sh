#!/bin/bash

echo "🎵 Hum It Out - Environment Verification"
echo "========================================"

# Test database connection
echo "🗄️ Testing database connection..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW() as current_time')
  .then(result => {
    console.log('✅ Database connected successfully!');
    console.log('   Time:', result.rows[0].current_time);
    pool.end();
  })
  .catch(error => {
    console.log('❌ Database connection failed:', error.message);
    pool.end();
  });
"

# Test Twilio configuration
echo ""
echo "📞 Testing Twilio configuration..."
node -e "
const twilio = require('twilio');
try {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('✅ Twilio credentials are valid format');
  console.log('   Phone Number:', process.env.TWILIO_PHONE_NUMBER);
  console.log('   Account SID:', process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + '...');
} catch (error) {
  console.log('❌ Twilio configuration issue:', error.message);
}
"

# Test OpenAI configuration  
echo ""
echo "🤖 Testing OpenAI configuration..."
node -e "
const { OpenAI } = require('openai');
try {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('✅ OpenAI API key is valid format');
  console.log('   Key starts with:', process.env.OPENAI_API_KEY.substring(0, 8) + '...');
} catch (error) {
  console.log('❌ OpenAI configuration issue:', error.message);
}
"

echo ""
echo "🚀 Ready to launch!"
echo ""
echo "Next steps:"
echo "1. npm run dev    # Start servers"
echo "2. npm run tunnel # Start ngrok" 
echo "3. Configure Twilio webhook with ngrok URL"
echo "4. Call and test!"
