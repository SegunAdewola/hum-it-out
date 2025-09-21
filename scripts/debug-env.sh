#!/bin/bash

echo "🔍 Debugging Environment Variables"
echo "=================================="

# Load .env file
set -a
source .env
set +a

echo "📋 Environment Status:"
echo ""

# Check critical variables
echo "🗄️ Database:"
if [ -n "$NEON_DATABASE_URL" ] && [[ "$NEON_DATABASE_URL" != *"username:password"* ]]; then
    echo "   ✅ NEON_DATABASE_URL is configured"
else
    echo "   ❌ NEON_DATABASE_URL needs configuration"
fi

echo ""
echo "📞 Twilio:"
if [ -n "$TWILIO_ACCOUNT_SID" ] && [[ "$TWILIO_ACCOUNT_SID" != *"xxx"* ]]; then
    echo "   ✅ TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID:0:10}..."
else
    echo "   ❌ TWILIO_ACCOUNT_SID needs configuration"
fi

if [ -n "$TWILIO_AUTH_TOKEN" ] && [[ "$TWILIO_AUTH_TOKEN" != *"xxx"* ]]; then
    echo "   ✅ TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN:0:8}..."
else
    echo "   ❌ TWILIO_AUTH_TOKEN needs configuration"
fi

if [ -n "$TWILIO_PHONE_NUMBER" ] && [[ "$TWILIO_PHONE_NUMBER" != *"123456"* ]]; then
    echo "   ✅ TWILIO_PHONE_NUMBER: $TWILIO_PHONE_NUMBER"
else
    echo "   ❌ TWILIO_PHONE_NUMBER needs configuration"
fi

echo ""
echo "🤖 OpenAI:"
if [ -n "$OPENAI_API_KEY" ] && [[ "$OPENAI_API_KEY" == sk-* ]]; then
    echo "   ✅ OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
else
    echo "   ❌ OPENAI_API_KEY needs configuration"
fi

echo ""
echo "🔧 Testing Node.js environment loading:"

cd backend
node -e "
require('dotenv').config({ path: '../.env' });
console.log('Environment test results:');
console.log('  TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'LOADED' : 'MISSING');
console.log('  TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'LOADED' : 'MISSING'); 
console.log('  TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? 'LOADED' : 'MISSING');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'LOADED' : 'MISSING');
console.log('  NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? 'LOADED' : 'MISSING');
"

cd ..
