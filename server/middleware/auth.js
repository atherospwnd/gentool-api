require('dotenv').config();

const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  // Get token from Authorization header or cookie
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split(' ')[1] : req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin
}; 