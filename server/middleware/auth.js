import jwt from 'jsonwebtoken';
import 'dotenv/config';

export const requireAuth = (req, res, next) => {
  // Get token from Authorization header or cookie
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader);
  let token;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }
  
  console.log('Token:', token ? 'Present' : 'Missing');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    req.user = decoded;
    console.log('Auth successful for user:', req.user.username);
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ 
      message: 'Invalid token',
      error: err.message 
    });
  }
};

export const requireAdmin = (req, res, next) => {
  console.log('Checking admin status:', req.user);
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}; 