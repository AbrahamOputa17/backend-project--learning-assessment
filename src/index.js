const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/database');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

const corsOptions = {
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    await db.testConnection();
    logger.info('Database connection successful');

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module && !process.env.VERCEL) {
  startServer();
}

module.exports = app;