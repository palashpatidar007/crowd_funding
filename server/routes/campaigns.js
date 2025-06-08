const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { db } = require('../database/init');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Create campaign
router.post('/', auth, upload.single('image'), (req, res) => {
  const {
    title,
    description,
    targetAmount,
    category,
    location,
    startDate,
    endDate
  } = req.body;

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    `INSERT INTO campaigns (
      title, description, targetAmount, currentAmount, category,
      location, imageUrl, startDate, endDate, organizerId,
      organizerType, isActive, createdAt
    ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
    [
      title,
      description,
      targetAmount,
      category,
      location,
      imageUrl,
      startDate,
      endDate,
      req.user.id,
      req.user.userType
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create campaign' });
      }
      res.status(201).json({
        id: this.lastID,
        message: 'Campaign created successfully'
      });
    }
  );
});

// Get all campaigns
router.get('/', (req, res) => {
  db.all(`
    SELECT c.*, 
           CASE 
             WHEN c.organizerType = 'ngo' THEN n.ngoName
             WHEN c.organizerType = 'campaigner' THEN camp.fullName
           END as organizerName
    FROM campaigns c
    LEFT JOIN ngos n ON c.organizerId = n.id AND c.organizerType = 'ngo'
    LEFT JOIN campaigners camp ON c.organizerId = camp.id AND c.organizerType = 'campaigner'
    WHERE c.isActive = 1
    ORDER BY c.createdAt DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
    res.json(rows || []);
  });
});

// Get campaign by ID
router.get('/:id', (req, res) => {
  db.get(`
    SELECT c.*, 
           CASE 
             WHEN c.organizerType = 'ngo' THEN n.ngoName
             WHEN c.organizerType = 'campaigner' THEN camp.fullName
           END as organizerName
    FROM campaigns c
    LEFT JOIN ngos n ON c.organizerId = n.id AND c.organizerType = 'ngo'
    LEFT JOIN campaigners camp ON c.organizerId = camp.id AND c.organizerType = 'campaigner'
    WHERE c.id = ? AND c.isActive = 1
  `, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch campaign' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(row);
  });
});

// Update campaign
router.put('/:id', auth, upload.single('image'), (req, res) => {
  const {
    title,
    description,
    targetAmount,
    category,
    location,
    startDate,
    endDate
  } = req.body;

  // First check if user owns the campaign
  db.get(
    'SELECT * FROM campaigns WHERE id = ? AND organizerId = ? AND organizerType = ?',
    [req.params.id, req.user.id, req.user.userType],
    (err, campaign) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!campaign) {
        return res.status(403).json({ error: 'Not authorized to update this campaign' });
      }

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : campaign.imageUrl;

      db.run(
        `UPDATE campaigns SET
          title = ?,
          description = ?,
          targetAmount = ?,
          category = ?,
          location = ?,
          imageUrl = ?,
          startDate = ?,
          endDate = ?,
          updatedAt = datetime('now')
        WHERE id = ?`,
        [
          title,
          description,
          targetAmount,
          category,
          location,
          imageUrl,
          startDate,
          endDate,
          req.params.id
        ],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to update campaign' });
          }
          res.json({ message: 'Campaign updated successfully' });
        }
      );
    }
  );
});

// Delete campaign (soft delete)
router.delete('/:id', auth, (req, res) => {
  db.run(
    'UPDATE campaigns SET isActive = 0 WHERE id = ? AND organizerId = ? AND organizerType = ?',
    [req.params.id, req.user.id, req.user.userType],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete campaign' });
      }
      if (this.changes === 0) {
        return res.status(403).json({ error: 'Not authorized to delete this campaign' });
      }
      res.json({ message: 'Campaign deleted successfully' });
    }
  );
});

module.exports = router; 