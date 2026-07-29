import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'database.sqlite');

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

// Helper wrapper to run sqlite queries with async/await
export const query = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Create tables if they do not exist
export async function initDb() {
  await query.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name_pt TEXT NOT NULL,
      name_en TEXT NOT NULL,
      tier INTEGER NOT NULL,
      enchantment INTEGER NOT NULL,
      item_type TEXT NOT NULL, -- 'raw_resource', 'refined_resource', 'equipment'
      weight REAL NOT NULL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS prices (
      item_id TEXT NOT NULL,
      city TEXT NOT NULL,
      quality INTEGER NOT NULL DEFAULT 1,
      sell_price_min INTEGER NOT NULL DEFAULT 0,
      sell_price_min_date TEXT,
      sell_price_max INTEGER NOT NULL DEFAULT 0,
      sell_price_max_date TEXT,
      buy_price_min INTEGER NOT NULL DEFAULT 0,
      buy_price_min_date TEXT,
      buy_price_max INTEGER NOT NULL DEFAULT 0,
      buy_price_max_date TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (item_id, city, quality),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS city_constants (
      city TEXT PRIMARY KEY,
      refining_bonus TEXT, -- e.g., 'FIBER', 'ORE', etc.
      crafting_bonuses TEXT -- JSON array of weapon/armor types
    );
  `);
  console.log('Database tables initialized.');
}

export default db;
