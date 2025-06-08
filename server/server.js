const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { initializeDatabase } = require('./database/init');
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration for development: allow only http://localhost:3000
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir);
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1); // Exit if database initialization fails
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);

// Existing campaigns route (updated to use database)
app.get('/api/campaigns', (req, res) => {
  const { db } = require('./database/init');
  
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running successfully',
    timestamp: new Date().toISOString(),
    database: 'SQLite3 connected'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    message: 'Server is running successfully',
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ 
    error: error.message || 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
}); 