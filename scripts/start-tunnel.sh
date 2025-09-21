#!/bin/bash

# Load environment variables
set -a
source .env
set +a

echo "🌐 Starting ngrok tunnel for Hum It Out..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo ""
    echo "Install options:"
    echo "• Mac: brew install ngrok/ngrok/ngrok"
    echo "• Manual: https://ngrok.com/download"
    exit 1
fi

# Setup authtoken if provided
if [ -n "$NGROK_AUTHTOKEN" ]; then
    echo "🔑 Configuring ngrok authtoken..."
    ngrok config add-authtoken $NGROK_AUTHTOKEN
    echo "✅ Authtoken configured"
else
    echo "⚠️  No NGROK_AUTHTOKEN found in .env"
    echo "   You can still use ngrok but with limitations"
fi

echo ""
echo "🚀 Starting tunnel on port 3001..."
echo ""
echo "📋 Twilio Webhook URL (copy this to Twilio Console):"
echo "   https://YOUR-NGROK-URL.ngrok.io/twilio/voice"
echo ""

# Start ngrok
ngrok http 3001
