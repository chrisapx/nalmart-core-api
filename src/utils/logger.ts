import fs from 'fs';
import path from 'path';
import winston from 'winston';
import env from '../config/env';

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const levels = {
  error: 0,
  warn:  1,
  info:  2,
  http:  3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn:  'yellow',
  info:  'green',
  http:  'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Console format — colourised for readability
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// File format — plain text, no ANSI escape codes
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level.toUpperCase().padEnd(5)}: ${info.message}${
      info.stack ? `\nStack: ${info.stack}` : ''
    }`
  )
);

const logger = winston.createLogger({
  // Always log everything (debug + http captures all requests)
  level: 'debug',
  levels,
  transports: [
    // Terminal — colourised, everything
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // logs/combined.log — every level, plain text
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 20 * 1024 * 1024, // 20 MB per file
      maxFiles: 5,               // keep 5 rotated files
      tailable: true,
    }),

    // logs/error.log — errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),

    // logs/http.log — every HTTP request/response line
    new winston.transports.File({
      filename: path.join(logsDir, 'http.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

export default logger;
