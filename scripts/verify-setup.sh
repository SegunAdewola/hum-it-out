#!/bin/bash

# Hum It Out - Setup Verification Script

echo "🎵 Hum It Out - Pre-Launch Verification"
echo "======================================="

# Check Node.js version
echo -n "✓ Node.js version: "
node --version

# Check npm version
echo -n "✓ NPM version: "
npm --version

# Check if dependencies are installed
if [ -d "node_modules" ]; then
    echo "✓ Root dependencies installed"
else
    echo "❌ Root dependencies missing - run: npm install"
fi

if [ -d "backend/node_modules" ]; then
    echo "✓ Backend dependencies installed"
else
    echo "❌ Backend dependencies missing - run: cd backend && npm install"
fi

if [ -d "frontend/node_modules" ]; then
    echo "✓ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies missing - run: cd frontend && npm install"
fi

# Check .env file
if [ -f ".env" ]; then
    echo "✓ Environment file exists"
    
    # Check for required environment variables
    echo ""
    echo "📋 Environment Variables Status:"
    
    check_env_var() {
        if grep -q "^$1=" .env && ! grep -q "^$1=.*xxx.*" .env && ! grep -q "^$1=.*your-.*" .env; then
            echo "  ✓ $1 is set"
            return 0
        else
            echo "  ❌ $1 needs to be configured"
            return 1
        fi
    }
    
    missing_vars=0
    
    check_env_var "NEON_DATABASE_URL" || ((missing_vars++))
    check_env_var "TWILIO_ACCOUNT_SID" || ((missing_vars++))
    check_env_var "TWILIO_AUTH_TOKEN" || ((missing_vars++))
    check_env_var "TWILIO_PHONE_NUMBER" || ((missing_vars++))
    check_env_var "OPENAI_API_KEY" || ((missing_vars++))
    
    if [ $missing_vars -eq 0 ]; then
        echo ""
        echo "🎉 All critical environment variables are configured!"
    else
        echo ""
        echo "⚠️  $missing_vars environment variables need configuration"
        echo "   See setup guide below for API key instructions"
    fi
else
    echo "❌ .env file missing"
fi

echo ""
echo "🚀 Ready to launch? Run the setup guide below!"
