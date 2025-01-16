import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../templates'),
  filename: (req, file, cb) => {
    cb(null, 'proposal_template.docx');
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('File must be a .docx document'));
    }
  }
});

// Download current template
router.get('/download', requireAuth, async (req, res) => {
  try {
    const templatePath = path.join(__dirname, '../templates/proposal_template.docx');
    const defaultTemplatePath = path.join(__dirname, '../templates/proposal_template_default.docx');
    
    // Check if custom template exists, otherwise use default
    const finalPath = await fs.access(templatePath)
      .then(() => templatePath)
      .catch(() => defaultTemplatePath);
    
    res.download(finalPath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download template' });
  }
});

// Upload new template
router.post('/upload', requireAuth, requireAdmin, upload.single('template'), async (req, res) => {
  try {
    res.json({ message: 'Template uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload template' });
  }
});

// Reset to default template
router.post('/reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    const templatePath = path.join(__dirname, '../templates/proposal_template.docx');
    const defaultTemplatePath = path.join(__dirname, '../templates/proposal_template_default.docx');
    
    // Remove custom template if it exists
    await fs.unlink(templatePath).catch(() => {});
    
    // Copy default template
    await fs.copyFile(defaultTemplatePath, templatePath);
    
    res.json({ message: 'Template reset to default' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset template' });
  }
});

export default router; 