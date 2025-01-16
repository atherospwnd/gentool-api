import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import servicesRouter from './routes/services.js';
import usersRouter from './routes/users.js';
import formsRouter from './routes/forms.js';
import templateRouter from './routes/template.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import logger from './utils/logger.js';
import { securityHeaders, limiter } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create templates directory if it doesn't exist
const templatesDir = path.join(__dirname, 'templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir);
}

const app = express();
const PORT = process.env.SERVER_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Database connection
const db = new sqlite3.Database(process.env.DB_PATH || 'data/database.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Define CORS options before using them
const corsOptions = process.env.NODE_ENV === 'production' 
  ? {
      // Production CORS settings
      origin: process.env.VUE_APP_URL,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400 // 24 hours
    }
  : {
      // Development CORS settings
      origin: 'http://localhost:8080',
      credentials: true
    };

// Apply CORS with the defined options
app.use(cors(corsOptions));

// Apply security headers in production
if (process.env.NODE_ENV === 'production') {
  app.use(securityHeaders);
  app.use('/api/', limiter);
}

// Log CORS configuration
console.log('CORS enabled for origin:', corsOptions.origin);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create API router
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Serve static files from templates directory
app.use('/templates', express.static(path.join(__dirname, 'templates')));

// Add headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Add cookie parser middleware
app.use(cookieParser());

// Add routes to API router instead of app
apiRouter.use('/services', servicesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/', formsRouter);
apiRouter.use('/template', templateRouter);

// Add check-auth endpoint
apiRouter.get('/check-auth', requireAuth, (req, res) => {
  try {
    console.log('Check auth request from user:', req.user);
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        is_admin: req.user.is_admin
      }
    });
  } catch (error) {
    console.error('Check auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add login endpoint to API router
apiRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        is_admin: user.is_admin 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update error handling to use the logger
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS enabled for origin:', corsOptions.origin);
});

export { app, db }; 