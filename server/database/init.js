const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database directory if it doesn't exist
const dbPath = path.join(__dirname, 'charity.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create tables
const createTables = () => {
  // Users table for common user information
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      userType TEXT NOT NULL CHECK (userType IN ('donor', 'ngo', 'campaigner', 'admin')),
      isVerified INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Donors table
  db.run(`
    CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT,
      panCard TEXT,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // NGOs table
  db.run(`
    CREATE TABLE IF NOT EXISTS ngos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      ngoName TEXT NOT NULL,
      phone TEXT,
      state TEXT NOT NULL,
      city TEXT NOT NULL,
      website TEXT,
      registrationNumber TEXT NOT NULL,
      certificateUrl TEXT,
      panTan TEXT,
      isApproved INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Campaigners table
  db.run(`
    CREATE TABLE IF NOT EXISTS campaigners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      panNumber TEXT NOT NULL,
      idType TEXT NOT NULL,
      govtIdUrl TEXT,
      isApproved INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Admins table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      accessCode TEXT NOT NULL,
      enable2FA INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Campaigns table
  db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      targetAmount DECIMAL(10,2) NOT NULL,
      raisedAmount DECIMAL(10,2) DEFAULT 0,
      organizerId INTEGER NOT NULL,
      organizerType TEXT NOT NULL CHECK (organizerType IN ('ngo', 'campaigner')),
      category TEXT NOT NULL,
      imageUrl TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Donations table
  db.run(`
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donorId INTEGER NOT NULL,
      campaignId INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      transactionId TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (donorId) REFERENCES donors (id),
      FOREIGN KEY (campaignId) REFERENCES campaigns (id)
    )
  `);

  console.log('Database tables created successfully.');
};

// Initialize database
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      createTables();
      resolve(db);
    });
  });
};

module.exports = { db, initializeDatabase }; 