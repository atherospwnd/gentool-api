require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
const fs = require('fs');
const servicesRouter = require('./routes/services');
const { requireAuth, requireAdmin } = require('./middleware/auth');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const app = express();
const PORT = process.env.SERVER_PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Database connection
const db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// CORS configuration
const corsOptions = {
  origin: process.env.VUE_APP_URL || 'http://localhost:8080',
  credentials: true
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create API router
const apiRouter = express.Router();
app.use('/api', apiRouter);

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

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    logger.info(`Login attempt for username: ${req.body.username}`);
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;

    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('Login successful for user:', username);

    // Also send token in response for Authorization header
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.stack}`);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all users
apiRouter.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, email, is_admin FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(user => ({
          ...user,
          is_admin: user.is_admin === 1 || user.is_admin === true
        })));
      });
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user
apiRouter.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    logger.info(`Creating new user. Username: ${req.body.username}, Email: ${req.body.email}, Is Admin: ${req.body.is_admin}`);
    
    const { username, email, password, is_admin } = req.body;

    // Validate input
    if (!username || !email || !password) {
      logger.warn('Invalid user creation attempt - missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, is_admin ? 1 : 0],
        function(err) {
          if (err) {
            logger.error(`Database error creating user: ${err.message}`);
            reject(err);
          } else {
            logger.info(`User created successfully. ID: ${this.lastID}, Username: ${username}`);
            resolve(this);
          }
        }
      );
    });

    res.status(201).json({ 
      id: result.lastID,
      username,
      email,
      is_admin
    });
  } catch (error) {
    logger.error(`Error creating user: ${error.stack}`);
    res.status(500).json({ 
      message: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete user
apiRouter.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ? AND username != "admin"', [req.params.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
apiRouter.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { username, email, is_admin } = req.body;

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET username = ?, email = ?, is_admin = ? WHERE id = ? AND username != "admin"',
        [username, email, is_admin ? 1 : 0, req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ id: req.params.id, username, email, is_admin });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add check-auth endpoint
apiRouter.get('/check-auth', requireAuth, (req, res) => {
  try {
    // Get fresh user data from database
    db.get('SELECT id, username, email, is_admin FROM users WHERE id = ?', [req.user.userId], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ message: 'Invalid authentication' });
      }
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: !!user.is_admin // Ensure boolean
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add logout endpoint
apiRouter.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Add logging to database connection
db.on('trace', (sql) => {
  logger.debug(`SQL Query: ${sql}`);
});

// Add logging middleware for all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Add error logging middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.stack}`);
  res.status(500).json({ message: 'Internal server error' });
});

// Add this middleware function after the authenticateToken middleware
function checkAdmin(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Add the middleware to the form structure endpoints
apiRouter.get('/form-structure', requireAuth, (req, res) => {
  db.get(
    'SELECT structure FROM form_structure ORDER BY created_at DESC LIMIT 1',
    [],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          message: 'Failed to fetch form structure',
          error: err.message 
        });
      }
      
      try {
        const structure = row ? JSON.parse(row.structure) : [];
        res.json(structure);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        res.status(500).json({ 
          message: 'Failed to parse form structure',
          error: parseError.message 
        });
      }
    }
  );
});

apiRouter.post('/form-structure', requireAuth, requireAdmin, async (req, res) => {
  try {
    const formStructure = req.body;
    
    // Validate the input
    if (!Array.isArray(formStructure)) {
      return res.status(400).json({ message: 'Invalid form structure format' });
    }

    // Convert to JSON string for storage
    const structureJson = JSON.stringify(formStructure);

    // Store in database
    db.run(
      `INSERT INTO form_structure (structure) VALUES (?)`,
      [structureJson],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Failed to save form structure' });
        }
        res.json({ message: 'Form structure saved successfully' });
      }
    );
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Proposal endpoints
apiRouter.post('/proposals', requireAuth, async (req, res) => {
  try {
    const data = JSON.stringify(req.body);
    const result = await db.run(
      'INSERT INTO proposals (user_id, data) VALUES (?, ?)',
      [req.user.id, data]
    );
    res.json({ id: result.lastID });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save proposal' });
  }
});

// Add the services routes
apiRouter.use('/services', servicesRouter);

// Create methodologies directory if it doesn't exist
const servicesDir = path.join(__dirname, 'public', 'services');
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
}

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.docx')) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename=' + path.split('/').pop());
    }
  }
}));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS enabled for origin:', corsOptions.origin);
}); 