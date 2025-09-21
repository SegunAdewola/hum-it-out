const logger = require('../utils/logger');

class ErrorHandler {
  static handle(error, req, res, next) {
    // Log the error with context
    logger.error('Request error:', {
      method: req.method,
      url: req.originalUrl,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.userId || null
    });

    // Handle different types of errors
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error, res);
    }

    if (error.name === 'UnauthorizedError' || error.status === 401) {
      return this.handleUnauthorizedError(error, res);
    }

    if (error.name === 'ForbiddenError' || error.status === 403) {
      return this.handleForbiddenError(error, res);
    }

    if (error.name === 'NotFoundError' || error.status === 404) {
      return this.handleNotFoundError(error, res);
    }

    if (error.code === '23505') { // PostgreSQL unique violation
      return this.handleDuplicateError(error, res);
    }

    if (error.code === 'ECONNABORTED') {
      return this.handleTimeoutError(error, res);
    }

    // Twilio webhook errors need special handling
    if (req.path.startsWith('/twilio')) {
      return this.handleTwilioError(error, req, res);
    }

    // API errors return JSON
    if (req.path.startsWith('/api')) {
      return this.handleAPIError(error, res);
    }

    // Default server error
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }

  static handleValidationError(error, res) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details || error.message
    });
  }

  static handleUnauthorizedError(error, res) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }

  static handleForbiddenError(error, res) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden access'
    });
  }

  static handleNotFoundError(error, res) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }

  static handleDuplicateError(error, res) {
    // Extract field name from PostgreSQL error
    const field = error.constraint ? error.constraint.replace(/_.*/, '') : 'field';
    
    return res.status(409).json({
      success: false,
      message: `Duplicate ${field} - this value already exists`
    });
  }

  static handleTimeoutError(error, res) {
    return res.status(408).json({
      success: false,
      message: 'Request timeout'
    });
  }

  static handleTwilioError(error, req, res) {
    // Twilio webhooks expect TwiML responses even on errors
    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    
    logger.error('Twilio webhook error:', {
      callSid: req.body.CallSid,
      from: req.body.From,
      error: error.message
    });

    twiml.say('Sorry, there was a technical issue. Please try again later.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }

  static handleAPIError(error, res) {
    // Determine appropriate status code
    let statusCode = 500;
    
    if (error.status) {
      statusCode = error.status;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('unauthorized')) {
      statusCode = 401;
    } else if (error.message.includes('forbidden')) {
      statusCode = 403;
    } else if (error.message.includes('validation')) {
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'API error',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack 
      })
    });
  }

  // 404 handler for undefined routes
  static notFound(req, res, next) {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.status = 404;
    next(error);
  }

  // Async error wrapper
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = ErrorHandler;
