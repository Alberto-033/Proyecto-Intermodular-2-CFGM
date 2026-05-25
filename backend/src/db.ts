import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, IrrigationLog } from './types.js';

// Resolve __dirname since we're using ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to local SQLite database at:', dbPath);
  }
});

// Wrap database calls in Promises for async/await support
export const dbRun = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const dbAll = <T>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

// Initialize database schema — uses await so the server only starts after all tables exist
export const initDatabase = async () => {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS irrigation_logs (
      id TEXT PRIMARY KEY,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      moisture_level REAL NOT NULL,
      temperature REAL NOT NULL,
      valve_state INTEGER NOT NULL,
      mode TEXT NOT NULL,
      water_duration INTEGER
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const defaults = [
    { key: 'mode', value: 'automatic' },
    { key: 'moistureThreshold', value: '35' },
    { key: 'irrigationDuration', value: '15' },
    { key: 'valveState', value: '0' }
  ];

  for (const d of defaults) {
    await dbRun(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`, [d.key, d.value]);
  }

  console.log('SQLite tables initialized successfully.');
};

// User Authentication Operations
export const createUser = async (username: string, email: string, passwordPlain: string): Promise<User> => {
  const id = uuidv4(); // Generate a secure UUID v4
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(passwordPlain, salt); // Cifrar contraseña con bcryptjs

  await dbRun(
    `INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)`,
    [id, username, email.toLowerCase(), passwordHash]
  );

  return {
    id,
    username,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString()
  };
};

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  const row = await dbGet<any>(
    `SELECT id, username, email, password_hash as passwordHash, created_at as createdAt FROM users WHERE email = ?`,
    [email.toLowerCase()]
  );
  return row;
};

export const updateUserPassword = async (id: string, newPasswordPlain: string): Promise<void> => {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPasswordPlain, salt);
  await dbRun(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, id]);
};

export const findUserById = async (id: string): Promise<User | undefined> => {
  const row = await dbGet<any>(
    `SELECT id, username, email, password_hash as passwordHash, created_at as createdAt FROM users WHERE id = ?`,
    [id]
  );
  return row;
};

// Config Operations
export const getConfigValue = async (key: string, defaultValue: string): Promise<string> => {
  const row = await dbGet<{ value: string }>(`SELECT value FROM config WHERE key = ?`, [key]);
  return row ? row.value : defaultValue;
};

export const setConfigValue = async (key: string, value: string): Promise<void> => {
  await dbRun(`INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`, [key, value]);
};

// Logging Operations
export const addIrrigationLog = async (
  moistureLevel: number,
  temperature: number,
  valveState: boolean,
  mode: 'manual' | 'automatic',
  waterDuration?: number
): Promise<IrrigationLog> => {
  const id = uuidv4(); // Log IDs also UUID
  const timestamp = new Date().toISOString();
  await dbRun(
    `INSERT INTO irrigation_logs (id, timestamp, moisture_level, temperature, valve_state, mode, water_duration) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, timestamp, moistureLevel, temperature, valveState ? 1 : 0, mode, waterDuration || null]
  );

  return {
    id,
    timestamp,
    moistureLevel,
    temperature,
    valveState,
    mode,
    waterDuration
  };
};

export const clearIrrigationLogs = async (): Promise<void> => {
  await dbRun(`DELETE FROM irrigation_logs`);
};

export const getIrrigationLogs = async (limit: number = 50): Promise<IrrigationLog[]> => {
  const rows = await dbAll<any>(
    `SELECT id, timestamp, moisture_level as moistureLevel, temperature, 
            valve_state as valveState, mode, water_duration as waterDuration 
     FROM irrigation_logs 
     ORDER BY timestamp DESC 
     LIMIT ?`,
    [limit]
  );

  return rows.map(r => ({
    ...r,
    valveState: r.valveState === 1
  }));
};
