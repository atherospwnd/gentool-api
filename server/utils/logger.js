const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  format: logFormat,
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // Error log file
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error' 
    }),
    // Combined log file
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log')
    })
  ]
});

module.exports = logger; 