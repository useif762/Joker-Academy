import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('joker.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS key_value_store (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY,
    name TEXT,
    password TEXT,
    parentPhone TEXT,
    gender TEXT,
    grade TEXT,
    completedLessons TEXT,
    examResults TEXT,
    lastSeen INTEGER
  );
`);

// Migration: Move users from key_value_store to users table if users table is empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const oldUsers = db.prepare("SELECT value FROM key_value_store WHERE key = 'joker_all_users'").get() as { value: string } | undefined;
  if (oldUsers) {
    try {
      const users = JSON.parse(oldUsers.value);
      if (Array.isArray(users)) {
        const insert = db.prepare(`
          INSERT OR REPLACE INTO users (phone, name, password, parentPhone, gender, grade, completedLessons, examResults, lastSeen)
          VALUES (@phone, @name, @password, @parentPhone, @gender, @grade, @completedLessons, @examResults, @lastSeen)
        `);
        const insertMany = db.transaction((users) => {
          for (const user of users) {
            insert.run({
              phone: user.phone,
              name: user.name,
              password: user.password || '',
              parentPhone: user.parentPhone || '',
              gender: user.gender || '',
              grade: user.grade,
              completedLessons: JSON.stringify(user.completedLessons || []),
              examResults: JSON.stringify(user.examResults || []),
              lastSeen: user.lastSeen || 0
            });
          }
        });
        insertMany(users);
        console.log(`Migrated ${users.length} users to new table.`);
      }
    } catch (e) {
      console.error('Migration failed:', e);
    }
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// --- Users API ---

// Get all users (for admin)
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    // Parse JSON fields
    const parsedUsers = users.map((u: any) => ({
      ...u,
      completedLessons: JSON.parse(u.completedLessons || '[]'),
      examResults: JSON.parse(u.examResults || '[]')
    }));
    res.json(parsedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single user
app.get('/api/users/:phone', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(req.params.phone) as any;
    if (user) {
      user.completedLessons = JSON.parse(user.completedLessons || '[]');
      user.examResults = JSON.parse(user.examResults || '[]');
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create or Update User
app.post('/api/users', (req, res) => {
  try {
    const user = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (phone, name, password, parentPhone, gender, grade, completedLessons, examResults, lastSeen)
      VALUES (@phone, @name, @password, @parentPhone, @gender, @grade, @completedLessons, @examResults, @lastSeen)
    `);
    stmt.run({
      phone: user.phone,
      name: user.name,
      password: user.password || '',
      parentPhone: user.parentPhone || '',
      gender: user.gender || '',
      grade: user.grade,
      completedLessons: JSON.stringify(user.completedLessons || []),
      examResults: JSON.stringify(user.examResults || []),
      lastSeen: user.lastSeen || Date.now()
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete User
app.delete('/api/users/:phone', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM users WHERE phone = ?');
    const result = stmt.run(req.params.phone);
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Heartbeat (Update lastSeen only)
app.post('/api/users/heartbeat', (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    
    const stmt = db.prepare('UPDATE users SET lastSeen = ? WHERE phone = ?');
    const result = stmt.run(Date.now(), phone);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      // User might have been deleted
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Generic Storage API (for Courses/Exams) ---

app.get('/api/storage/:key', (req, res) => {
  try {
    // Redirect user fetch to new API for backward compatibility if needed, 
    // but better to enforce new API usage in client.
    if (req.params.key === 'joker_all_users') {
       // Forward to new logic
       const users = db.prepare('SELECT * FROM users').all();
       const parsedUsers = users.map((u: any) => ({
         ...u,
         completedLessons: JSON.parse(u.completedLessons || '[]'),
         examResults: JSON.parse(u.examResults || '[]')
       }));
       return res.json(parsedUsers);
    }

    const stmt = db.prepare('SELECT value FROM key_value_store WHERE key = ?');
    const row = stmt.get(req.params.key) as { value: string } | undefined;
    if (row) {
      res.json(JSON.parse(row.value));
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error reading from DB:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/storage/:key', (req, res) => {
  try {
    if (req.params.key === 'joker_all_users') {
      // Prevent writing to old key
      return res.status(400).json({ error: 'Use /api/users endpoints' });
    }

    const stmt = db.prepare('INSERT OR REPLACE INTO key_value_store (key, value) VALUES (?, ?)');
    stmt.run(req.params.key, JSON.stringify(req.body));
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing to DB:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
