const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database('database.db');

db.serialize(() => {
  // Drop existing tables if they exist
  db.run('DROP TABLE IF EXISTS users');
  db.run('DROP TABLE IF EXISTS form_structure');
  db.run('DROP TABLE IF EXISTS proposals');
  db.run('DROP TABLE IF EXISTS services');

  // Create users table
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      is_admin BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table created successfully');
      
      // Create admin user
      bcrypt.hash('ch4ngeme333!!!', 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return;
        }
        
        db.run(`
          INSERT INTO users (username, password, email, is_admin)
          VALUES (?, ?, ?, ?)
        `, ['admin', hashedPassword, 'admin@redteampartners.com', 1], (err) => {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Admin user created successfully');
          }
        });
      });
    }
  });

  // Create form_structure table
  db.run(`
    CREATE TABLE form_structure (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating form_structure table:', err);
    } else {
      console.log('Form structure table created successfully');
      
      // Add initial form structure
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

      // Insert the initial form structure
      db.run(
        `INSERT INTO form_structure (structure) VALUES (?)`,
        [JSON.stringify(initialFormStructure)],
        (err) => {
          if (err) {
            console.error('Error inserting initial form structure:', err);
          } else {
            console.log('Initial form structure created successfully');
          }
        }
      );
    }
  });

  // Create proposals table
  db.run(`
    CREATE TABLE proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating proposals table:', err);
    } else {
      console.log('Proposals table created successfully');
    }
  });

  // Create services table
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT,
      display_order INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating services table:', err);
    } else {
      console.log('Services table created successfully');
      
      // Add initial services if none exist
      db.get('SELECT COUNT(*) as count FROM services', [], (err, row) => {
        if (err) {
          console.error('Error checking services:', err);
          return;
        }

        if (row.count === 0) {
          // Insert all services
          db.run(`
            INSERT INTO services (name, title, display_order) VALUES 
            ('ISO 27001 Certification', 'iso27001certification', 1),
            ('Mobile Application Testing', 'mobileapplicationtesting', 2),
            ('Phishing Simulation', 'phishingsimulation', 3),
            ('Red Team Assessment', 'redteamassessment', 4),
            ('Secure Code Review', 'securecodereview', 5),
            ('Silver Subscription', 'silversubscription', 6),
            ('Vulnerability Assessment', 'vulnerabilityassessment', 7),
            ('API Penetration Testing', 'apipenetrationtesting', 8),
            ('Bronze Subscription', 'bronzesubscription', 9),
            ('Cloud Assessment', 'cloudassessment', 10),
            ('Cyber Awareness', 'cyberawareness', 11),
            ('Cyber Essential', 'cyberessential', 12),
            ('Cyber Essentials Plus', 'cyberessentialsplus', 13),
            ('Gold Subscription', 'goldsubscription', 14),
            ('Infrastructure Testing', 'infrastructuretesting', 15),
            ('Test & Authorization order form', 'testauthorization', 16),
            ('Web Application Penetration Testing', 'wapt', 17)
          `, (err) => {
            if (err) {
              console.error('Error inserting services:', err);
            } else {
              console.log('Services inserted successfully');
            }
          });
        }
      });
    }
  });
});

// Close the database connection
setTimeout(() => {
  db.close(() => {
    console.log('Database initialization completed');
  });
}, 1000); 