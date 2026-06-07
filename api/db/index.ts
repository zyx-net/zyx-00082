import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', '..', 'data', 'childcare.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('guardian', 'teacher', 'admin')),
      phone TEXT,
      id_card_last4 TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT CHECK (gender IN ('男', '女')),
      age INTEGER,
      class_name TEXT,
      guardian1_id INTEGER,
      guardian2_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guardian1_id) REFERENCES users(id),
      FOREIGN KEY (guardian2_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS authorizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      applicant_id INTEGER NOT NULL,
      approver_id INTEGER,
      pickup_person_name TEXT NOT NULL,
      pickup_person_phone TEXT NOT NULL,
      pickup_person_id_last4 TEXT NOT NULL,
      pickup_relation TEXT NOT NULL,
      time_window_start DATETIME NOT NULL,
      time_window_end DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN (
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'PENDING_VERIFICATION',
        'VERIFIED',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED'
      )),
      reject_reason TEXT,
      verified_by INTEGER,
      verified_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id),
      FOREIGN KEY (applicant_id) REFERENCES users(id),
      FOREIGN KEY (approver_id) REFERENCES users(id),
      FOREIGN KEY (verified_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      authorization_id INTEGER,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_auth_child_date ON authorizations(child_id, DATE(time_window_start));
    CREATE INDEX IF NOT EXISTS idx_auth_status ON authorizations(status);
    CREATE INDEX IF NOT EXISTS idx_audit_auth ON audit_logs(authorization_id);
    CREATE INDEX IF NOT EXISTS idx_auth_time ON authorizations(time_window_start, time_window_end);
  `);
}

initTables();
seedDatabase(db);

export default db;
