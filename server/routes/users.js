import express from 'express';
import { db } from '../index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Fetching users...');
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, username, email, is_admin, created_at 
         FROM users 
         ORDER BY created_at DESC`,
        [],
        (err, rows) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            console.log(`Found ${rows.length} users`);
            resolve(rows);
          }
        }
      );
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new user (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, email, is_admin } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ 
        message: 'Username, password, and email are required' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, email, is_admin)
         VALUES (?, ?, ?, ?)`,
        [username, hashedPassword, email, is_admin ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const newUser = {
      id: result.lastID,
      username,
      email,
      is_admin: Boolean(is_admin)
    };

    res.status(201).json({ user: newUser });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({
        message: 'Username or email already exists'
      });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM users WHERE id = ?',
        [req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    if (result.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user data
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ 
        errors: { general: 'User not found' }
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        errors: { currentPassword: 'Current password is incorrect' }
      });
    }

    // Prepare update data
    const updates = [];
    const values = [];

    if (email && email !== user.email) {
      // Check if email is already taken
      const emailExists = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (emailExists) {
        return res.status(400).json({ 
          errors: { email: 'Email is already in use' }
        });
      }

      updates.push('email = ?');
      values.push(email);
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        errors: { general: 'No changes to update' }
      });
    }

    // Add user ID to values array
    values.push(userId);

    // Update user
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users 
         SET ${updates.join(', ')}
         WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // Get updated user data
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, is_admin FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      errors: { general: 'Failed to update profile' }
    });
  }
});

export default router; 