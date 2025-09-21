const { Pool } = require('pg');
const config = require('../config/environment');
const logger = require('./logger');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.pool = new Pool({
        connectionString: config.database.url,
        ssl: config.database.ssl,
        ...config.database.pool
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info('Database connected successfully', {
        database: config.database.url ? 'configured' : 'missing',
        ssl: config.database.ssl ? 'enabled' : 'disabled'
      });

      // Set up connection event handlers
      this.pool.on('connect', (client) => {
        logger.debug('New database client connected');
      });

      this.pool.on('error', (err, client) => {
        logger.error('Unexpected database error:', {
          error: err.message,
          stack: err.stack
        });
      });

      this.pool.on('remove', (client) => {
        logger.debug('Database client removed from pool');
      });

      return this.pool;
    } catch (error) {
      logger.error('Database connection failed:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async query(text, params = []) {
    if (!this.pool) {
      await this.connect();
    }

    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow query detected:', {
          query: text,
          params: params.length > 0 ? 'provided' : 'none',
          duration: `${duration}ms`,
          rows: res.rowCount
        });
      } else if (process.env.NODE_ENV === 'development') {
        logger.debug('Database query:', {
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: res.rowCount
        });
      }

      return res;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query error:', {
        query: text,
        params: params.length > 0 ? 'provided' : 'none',
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async transaction(queries) {
    if (!this.pool) {
      await this.connect();
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const { text, params } of queries) {
        const result = await client.query(text, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      
      logger.debug('Transaction completed successfully', {
        queries: queries.length
      });
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed, rolled back:', {
        error: error.message,
        queries: queries.length
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as pg_version');
      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].pg_version,
        connectionCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async close() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isConnected = false;
        logger.info('Database connection pool closed');
      } catch (error) {
        logger.error('Error closing database pool:', error);
      }
    }
  }

  getPool() {
    return this.pool;
  }

  isHealthy() {
    return this.isConnected && this.pool;
  }

  // Connection statistics
  getStats() {
    if (!this.pool) return null;
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      options: {
        max: this.pool.options.max,
        min: this.pool.options.min,
        acquireTimeoutMillis: this.pool.options.acquireTimeoutMillis,
        idleTimeoutMillis: this.pool.options.idleTimeoutMillis
      }
    };
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new DatabaseManager();
  }
  return instance;
}

module.exports = {
  DatabaseManager,
  getInstance
};
