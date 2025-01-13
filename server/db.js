require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();

// Create a Promise-based wrapper for database operations
class Database {
  constructor() {
    this.db = new sqlite3.Database(process.env.DB_PATH, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}

const db = new Database();
module.exports = db; 