const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Add colors to winston
winston.addColors(logColors);

// Create winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      // Format the log message
      let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      
      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  ),
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let logMessage = `${timestamp} [${level}]: ${message}`;
          
          // Add metadata if present and not too verbose
          if (Object.keys(meta).length > 0) {
            const metaStr = JSON.stringify(meta, null, 2);
            if (metaStr.length < 500) {
              logMessage += `\n${metaStr}`;
            } else {
              logMessage += ` [metadata available]`;
            }
          }
          
          return logMessage;
        })
      ),
    })
  );
}

// Add request logging middleware
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  if (next) next();
};

// Structured logging methods
logger.logTwilioEvent = (event, data) => {
  logger.info(`Twilio ${event}`, {
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.logProcessingEvent = (event, sessionId, data = {}) => {
  logger.info(`Processing ${event}`, {
    event,
    sessionId,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.logUserAction = (action, userId, data = {}) => {
  logger.info(`User ${action}`, {
    action,
    userId,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.logSecurityEvent = (event, details = {}) => {
  logger.warn(`Security ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    severity: 'security'
  });
};

// Error formatting helper
logger.formatError = (error, context = {}) => {
  return {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
    timestamp: new Date().toISOString()
  };
};

module.exports = logger;
