const express   = require('express');
const dotenv    = require('dotenv');
const path      = require('path');
const cors      = require('cors');

dotenv.config();

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────
const routes = require('./routes');
app.use(routes);

app.get('/', (_req, res) => res.json({ status: 'HRMS Backend running (PostgreSQL)' }));

// ── Global Error Handler ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ── Boot ──────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

async function boot() {
  try {
    // 1. Test PostgreSQL connection
    const { pool } = require('./db/pg');
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');

    // 2. Run schema (idempotent — uses IF NOT EXISTS)
    const fs   = require('fs');
    const pgPath = path.join(__dirname, 'db', 'schema.sql');
    if (fs.existsSync(pgPath)) {
      try {
        const sql = fs.readFileSync(pgPath, 'utf8');
        await pool.query(sql);
        console.log('✅ Schema applied');
      } catch (sqlErr) {
        console.warn('⚠️ Schema notice (tables already verified):', sqlErr.message);
      }
    }

    // 3. Seed super admin
    const seed = require('./db/seed-pg');
    await seed();

    // 4. Start cron jobs
    require('./cron/attendance.cron');
    require('./cron/autoMarkAbsent.cron');

    // 5. Listen
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  } catch (err) {
    console.error('❌ Boot failed error details:', err.stack || err);
    process.exit(1);
  }
}

boot();
