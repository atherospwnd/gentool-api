import express from 'express';
import { db } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get form structure
router.get('/form-structure', requireAuth, async (req, res) => {
  try {
    const formStructure = await new Promise((resolve, reject) => {
      db.get(
        'SELECT structure FROM form_structure ORDER BY created_at DESC LIMIT 1',
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!formStructure) {
      // Return default structure if none exists
      return res.json({
        structure: [
          {
            title: "Basic Information",
            fields: []
          }
        ]
      });
    }

    res.json({ structure: JSON.parse(formStructure.structure) });
  } catch (error) {
    console.error('Error fetching form structure:', error);
    res.status(500).json({ error: 'Failed to fetch form structure' });
  }
});

// Save form structure
router.post('/form-structure', requireAuth, async (req, res) => {
  try {
    const { structure } = req.body;
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO form_structure (structure) VALUES (?)`,
        [JSON.stringify(structure)],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({ message: 'Form structure saved successfully' });
  } catch (error) {
    console.error('Error saving form structure:', error);
    res.status(500).json({ error: 'Failed to save form structure' });
  }
});

export default router; 