const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)} minutes`,
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`
    },
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database health check
router.get('/db', async (req, res) => {
  try {
    const db = require('../utils/database').getInstance();
    const result = await db.query('SELECT NOW() as current_time');
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].current_time
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// API endpoints health check
router.get('/apis', async (req, res) => {
  const checks = {
    openai: false,
    twilio: false,
    neon: false
  };

  try {
    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
      checks.openai = true;
    }

    // Check Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      checks.twilio = true;
    }

    // Check Neon/Database
    if (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL) {
      checks.neon = true;
    }

    const allHealthy = Object.values(checks).every(status => status === true);

    res.status(allHealthy ? 200 : 206).json({
      status: allHealthy ? 'healthy' : 'partial',
      apis: checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      apis: checks,
      error: error.message
    });
  }
});

module.exports = router;
