const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { db } = require('../database/init');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to generate JWT token
const generateToken = (user, profile) => {
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      userType: user.userType,
      profile: profile
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      userType: user.userType,
      profile
    }
  };
};

// Helper function to hash password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Signup route
router.post('/signup', async (req, res) => {
  const { email, password, userType, fullName, ngoName } = req.body;

  try {
    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (user) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      db.run(
        'INSERT INTO users (email, password, userType) VALUES (?, ?, ?)',
        [email, hashedPassword, userType],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;

          // Create profile based on user type
          if (userType === 'campaigner') {
            db.run(
              'INSERT INTO campaigners (id, fullName) VALUES (?, ?)',
              [userId, fullName],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to create campaigner profile' });
                }
                res.status(201).json({ message: 'User created successfully' });
              }
            );
          } else if (userType === 'ngo') {
            db.run(
              'INSERT INTO ngos (id, ngoName) VALUES (?, ?)',
              [userId, ngoName],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to create NGO profile' });
                }
                res.status(201).json({ message: 'User created successfully' });
              }
            );
          }
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Signin route
router.post('/signin', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile based on type
    let profile;
    if (user.userType === 'campaigner') {
      db.get('SELECT * FROM campaigners WHERE id = ?', [user.id], (err, campaigner) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch profile' });
        }
        profile = campaigner;
        const tokenInfo = generateToken(user, profile);
        res.json(tokenInfo);
      });
    } else if (user.userType === 'ngo') {
      db.get('SELECT * FROM ngos WHERE id = ?', [user.id], (err, ngo) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch profile' });
        }
        profile = ngo;
        const tokenInfo = generateToken(user, profile);
        res.json(tokenInfo);
      });
    }
  });
});

// Donor Signup
router.post('/signup/donor', async (req, res) => {
  try {
    const { fullName, email, phone, password, panCard } = req.body;

    // Check if user already exists
    db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Insert user
      db.run('INSERT INTO users (email, password, userType) VALUES (?, ?, ?)', 
        [email, hashedPassword, 'donor'], 
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;

          // Insert donor details
          db.run('INSERT INTO donors (userId, fullName, phone, panCard) VALUES (?, ?, ?, ?)',
            [userId, fullName, phone, panCard],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create donor profile' });
              }

              // Fetch user and donor profile for token
              db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
                if (err || !user) {
                  return res.status(500).json({ error: 'Failed to fetch user after creation' });
                }
                db.get('SELECT * FROM donors WHERE userId = ?', [userId], (err, donorProfile) => {
                  if (err || !donorProfile) {
                    return res.status(500).json({ error: 'Failed to fetch donor profile after creation' });
                  }
                  const tokenInfo = generateToken(user, donorProfile);
                  res.status(201).json(tokenInfo);
                });
              });
            });
        });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// NGO Signup
router.post('/signup/ngo', upload.single('certificate'), async (req, res) => {
  try {
    const { 
      ngoName, email, phone, password, state, city, 
      website, registrationNumber, panTan 
    } = req.body;

    const certificateUrl = req.file ? req.file.filename : null;

    // Check if user already exists
    db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Insert user
      db.run('INSERT INTO users (email, password, userType) VALUES (?, ?, ?)', 
        [email, hashedPassword, 'ngo'], 
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;

          // Insert NGO details
          db.run(`INSERT INTO ngos (userId, ngoName, phone, state, city, website, 
                   registrationNumber, certificateUrl, panTan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, ngoName, phone, state, city, website, registrationNumber, certificateUrl, panTan],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create NGO profile' });
              }

              const tokenInfo = generateToken(user, profile);
              res.status(201).json(tokenInfo);
            });
        });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Campaigner Signup
router.post('/signup/campaigner', upload.single('govtId'), async (req, res) => {
  try {
    const { 
      fullName, email, phone, password, city, state, 
      panNumber, idType 
    } = req.body;

    const govtIdUrl = req.file ? req.file.filename : null;

    // Check if user already exists
    db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Insert user
      db.run('INSERT INTO users (email, password, userType) VALUES (?, ?, ?)', 
        [email, hashedPassword, 'campaigner'], 
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;

          // Insert campaigner details
          db.run(`INSERT INTO campaigners (userId, fullName, phone, city, state, 
                   panNumber, idType, govtIdUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, fullName, phone, city, state, panNumber, idType, govtIdUrl],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create campaigner profile' });
              }

              const tokenInfo = generateToken(user, profile);
              res.status(201).json(tokenInfo);
            });
        });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Signup
router.post('/signup/admin', async (req, res) => {
  try {
    const { email, password, accessCode, enable2FA } = req.body;

    // Validate access code (in production, use a more secure method)
    const validAccessCode = 'ADMIN2024';
    if (accessCode !== validAccessCode) {
      return res.status(400).json({ error: 'Invalid access code' });
    }

    // Check if user already exists
    db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Insert user
      db.run('INSERT INTO users (email, password, userType) VALUES (?, ?, ?)', 
        [email, hashedPassword, 'admin'], 
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;

          // Insert admin details
          db.run('INSERT INTO admins (userId, accessCode, enable2FA) VALUES (?, ?, ?)',
            [userId, accessCode, enable2FA ? 1 : 0],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create admin profile' });
              }

              const tokenInfo = generateToken(user, profile);
              res.status(201).json(tokenInfo);
            });
        });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password, userType } = req.body;

    // Get user from database
    db.get('SELECT * FROM users WHERE email = ? AND userType = ?', [email, userType], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Get user profile based on type
      let profileQuery;
      let profileTable;
      
      switch (userType) {
        case 'donor':
          profileQuery = 'SELECT fullName FROM donors WHERE userId = ?';
          break;
        case 'ngo':
          profileQuery = 'SELECT ngoName, isApproved FROM ngos WHERE userId = ?';
          break;
        case 'campaigner':
          profileQuery = 'SELECT fullName, isApproved FROM campaigners WHERE userId = ?';
          break;
        case 'admin':
          profileQuery = 'SELECT enable2FA FROM admins WHERE userId = ?';
          break;
        default:
          return res.status(400).json({ error: 'Invalid user type' });
      }

      db.get(profileQuery, [user.id], (err, profile) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to get user profile' });
        }

        const tokenInfo = generateToken(user, profile);
        
        res.json({
          message: 'Login successful',
          ...tokenInfo
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Phone/OTP Login (simplified - in production, implement proper OTP)
router.post('/login/otp', (req, res) => {
  try {
    const { phone, userType } = req.body;

    let phoneQuery;
    switch (userType) {
      case 'donor':
        phoneQuery = 'SELECT u.*, d.fullName FROM users u JOIN donors d ON u.id = d.userId WHERE d.phone = ? AND u.userType = ?';
        break;
      case 'ngo':
        phoneQuery = 'SELECT u.*, n.ngoName, n.isApproved FROM users u JOIN ngos n ON u.id = n.userId WHERE n.phone = ? AND u.userType = ?';
        break;
      case 'campaigner':
        phoneQuery = 'SELECT u.*, c.fullName, c.isApproved FROM users u JOIN campaigners c ON u.id = c.userId WHERE c.phone = ? AND u.userType = ?';
        break;
      default:
        return res.status(400).json({ error: 'Phone login not available for this user type' });
    }

    db.get(phoneQuery, [phone, userType], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(400).json({ error: 'User not found with this phone number' });
      }

      // In production, send actual OTP here
      // For now, return success message
      res.json({
        message: 'OTP sent successfully',
        tempToken: 'temp-' + user.id // In production, use a proper temp token
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List all donors
router.get('/donors', (req, res) => {
  const sql = `
    SELECT u.id, u.email, d.fullName, d.phone, d.panCard, u.createdAt
    FROM users u
    JOIN donors d ON u.id = d.userId
    ORDER BY u.createdAt DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch donors' });
    }
    res.json(rows);
  });
});

module.exports = router; 