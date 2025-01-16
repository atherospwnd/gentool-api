import express from 'express';
import { db } from '../index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all services
router.get('/', requireAuth, async (req, res) => {
  try {
    const services = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, title, display_order
         FROM services
         ORDER BY display_order ASC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update services (admin only)
router.put('/', requireAuth, requireAdmin, async (req, res) => {
  const services = req.body;
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    await Promise.all(services.map(service => {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO services 
           (id, name, title, display_order)
           VALUES (?, ?, ?, ?)`,
          [
            service.id,
            service.name,
            service.title,
            service.display_order
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }));
    
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Services updated successfully' });
  } catch (err) {
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve());
    });
    res.status(500).json({ error: err.message });
  }
});

// Delete service (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Deleting service:', req.params.id);
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM services WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('Service not found'));
        } else {
          console.log('Service deleted successfully');
          resolve();
        }
      });
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ 
      error: err.message,
      message: 'Failed to delete service' 
    });
  }
});

export default router; 