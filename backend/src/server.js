// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');

const config = require('./config/environment');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const DatabaseManager = require('./utils/database');

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const twilioRoutes = require('./routes/twilio');
const healthRoutes = require('./routes/health');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.cors.origin,
    methods: ["GET", "POST"]
  }
});

// Initialize database connection
const db = new DatabaseManager();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-twilio-signature']
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const twilioLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 calls per 5 minutes per IP
  message: 'Too many calls from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for valid Twilio requests
    const twilioSignature = req.headers['x-twilio-signature'];
    return twilioSignature && process.env.NODE_ENV === 'production';
  }
});

app.use('/api', generalLimiter);
app.use('/twilio', twilioLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  });
  next();
});

// Socket.IO setup
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined their room`);
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);
app.set('db', db);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/twilio', twilioRoutes);
app.use('/health', healthRoutes);

// Serve static files (for downloads)
app.use('/downloads', express.static('generated', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Hum It Out API',
    version: '1.0.0',
    description: 'Voice to music conversion API',
    endpoints: {
      auth: '/api/auth',
      dashboard: '/api/dashboard', 
      twilio: '/twilio',
      health: '/health'
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    db.close().then(() => {
      logger.info('Database connections closed');
      process.exit(0);
    }).catch((error) => {
      logger.error('Error during database shutdown:', error);
      process.exit(1);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = config.server.port || 3001;
const HOST = config.server.host || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`🎵 Hum It Out API server running on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Press Ctrl+C to stop the server');
});

module.exports = { app, server, io };
