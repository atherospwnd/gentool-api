const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const logger = require('../utils/logger');

const db = new sqlite3.Database(path.join(__dirname, '../database/users.db'));

// Function to generate random email
const generateEmail = (username) => `${username}@example.com`;

// Function to generate random username
const generateUsername = (index) => `user${index}`;

// Array of first names for more realistic usernames
const firstNames = [
  'john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'robert', 'emma', 
  'james', 'olivia', 'william', 'ava', 'joseph', 'mia', 'thomas', 'sophia',
  'charles', 'isabella', 'daniel', 'emily'
];

// Array of last names
const lastNames = [
  'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
  'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson',
  'thomas', 'taylor', 'moore', 'jackson', 'martin'
];

async function seedUsers() {
  try {
    // Default password for all users
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Keep track of used usernames to avoid duplicates
    const usedUsernames = new Set();

    // Generate 200 users
    for (let i = 1; i <= 200; i++) {
      // Generate a unique username
      let username;
      do {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const randomNum = Math.floor(Math.random() * 1000);
        username = `${firstName}.${lastName}${randomNum}`;
      } while (usedUsernames.has(username));

      usedUsernames.add(username);

      // Random admin status (1 in 10 chance of being admin)
      const isAdmin = Math.random() < 0.1;

      // Insert user
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
          [
            username,
            generateEmail(username),
            hashedPassword,
            isAdmin ? 1 : 0
          ],
          (err) => {
            if (err) {
              logger.error(`Error creating user ${username}: ${err.message}`);
              reject(err);
            } else {
              logger.info(`Created user ${username} (admin: ${isAdmin})`);
              resolve();
            }
          }
        );
      });
    }

    logger.info('Successfully created 200 users');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding users:', error);
    process.exit(1);
  }
}

// Run the seeding
seedUsers(); 