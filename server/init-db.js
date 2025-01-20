import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Use in-memory database in production, otherwise use file
const dbPath = (process.env.DB_PATH || path.join(dataDir, 'database.db'));

const initDb = async () => {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err);
    } else {
      console.log('Connected to SQLite database');
    }
  });

  // Promisify db.run
  const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  try {
    // Drop existing tables
    await run('DROP TABLE IF EXISTS users');
    await run('DROP TABLE IF EXISTS form_structure');
    await run('DROP TABLE IF EXISTS proposals');
    await run('DROP TABLE IF EXISTS services');

    // Create tables
    await run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created successfully');

    // Create admin user
    const adminPassword = 'ch4ngeme333!!!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await run(
      'INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, ?)',
      ['admin', hashedPassword, 'admin@redteampartners.com', 1]
    );
    console.log('Admin user created successfully');

    // Create form_structure table
    await run(`
      CREATE TABLE form_structure (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        structure TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Form structure table created successfully');

    // Initial form structure
    const initialFormStructure = [
      {
        id: Date.now(),
        title: "Account Manager Information",
        fields: [
          {
            id: "manager_name",
            type: "text",
            label: "Name",
            required: true,
            minLength: 2,
            maxLength: 100
          },
          {
            id: "manager_contact",
            type: "text",
            label: "Contact Number",
            required: true,
            minLength: 10,
            maxLength: 20
          },
          {
            id: "manager_email",
            type: "email",
            label: "Email",
            required: true,
            pattern: "^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$",
            maxLength: 255
          }
        ]
      },
      {
        id: Date.now() + 1,
        title: "Client Information",
        fields: [
          {
            id: "company_name",
            type: "text",
            label: "Company name",
            required: true,
            minLength: 2,
            maxLength: 100
          },
          {
            id: "client_name",
            type: "text",
            label: "Client name",
            required: true,
            minLength: 2,
            maxLength: 100
          },
          {
            id: "client_email",
            type: "email",
            label: "Client email",
            required: true,
            pattern: "^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$",
            maxLength: 255
          },
          {
            id: "company_number",
            type: "text",
            label: "Company number",
            required: true,
            minLength: 5,
            maxLength: 20
          }
        ]
      },
      {
        id: Date.now() + 3,
        title: "Services",
        fields: [
          {
            id: "services_services",
            type: "services-select",
            label: "Select Services",
            required: false
          }
        ]
      },
      {
        id: Date.now() + 2,
        title: "Add on Services",
        fields: [
          {
            id: "premium_service",
            type: "checkbox",
            label: "Premium Services/Quick Delivery (within 2 weeks)",
            required: false
          },
          {
            id: "evening_test",
            type: "checkbox",
            label: "Evening Test (After 6pm)",
            required: false
          },
          {
            id: "weekend_holiday",
            type: "checkbox",
            label: "Weekend/Holiday",
            required: false
          },
          {
            id: "onsite_delivery",
            type: "checkbox",
            label: "On-Site Delivery",
            required: false
          }
        ]
      }
    ];

    // Insert form structure
    await run(
      'INSERT INTO form_structure (structure) VALUES (?)',
      [JSON.stringify(initialFormStructure)]
    );
    console.log('Initial form structure created successfully');

    // Create proposals table
    await run(`
      CREATE TABLE proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Proposals table created successfully');

    // Create services table
    await run(`
      CREATE TABLE services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        title TEXT,
        display_order INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Services table created successfully');

    // Insert initial services
    await run(`
      INSERT INTO services (name, title, display_order) VALUES 
      ('API Penetration Testing', 'apipenetrationtesting', 1),
      ('Bronze Subscription', 'bronzesubscription', 2),
      ('Cloud Assessment', 'cloudassessment', 3),
      ('Cyber Awareness', 'cyberawareness', 4),
      ('Cyber Essential', 'cyberessential', 5),
      ('Cyber Essentials Plus', 'cyberessentialsplus', 6),
      ('Cyber Threat Intelligence', 'cyberthreatintelligence', 7),
      ('Firewall Review', 'firewallreview', 8),
      ('Gold Subscription', 'goldsubscription', 9),
      ('Infrastructure Testing', 'infrastructuretesting', 10),
      ('ISO 27001 Certification', 'iso27001certification', 11),
      ('Mobile Application Testing', 'mobileapplicationtesting', 12),
      ('Phishing Simulation', 'phishingsimulation', 13),
      ('Red Team Assessment', 'redteamassessment', 14),
      ('Secure Code Review', 'securecodereview', 15),
      ('Silver Subscription', 'silversubscription', 16),
      ('Vulnerability Assessment', 'vulnerabilityassessment', 17),
      ('Web Application Penetration Testing', 'wapt', 18)
    `);
    console.log('Services inserted successfully');

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
};

// Run the initialization
initDb().catch(console.error);

export default initDb; 