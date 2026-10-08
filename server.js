// ---------------------------------------------------------------
// E-Cell SMVIT: backend
// Job of this file: serve the website + provide 3 API endpoints
//   POST /api/signup  -> create an account
//   POST /api/login   -> check credentials, hand out a token
//   GET  /api/me      -> (protected) return the logged-in user
// ---------------------------------------------------------------

require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

// Neon database connection
const DATABASE_URL = process.env.STORAGE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Database connection URL is not set.');
}

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set.');
}

const sql = neon(DATABASE_URL);

// ---------- helpers ----------

// Never send the password hash to the browser.
const publicUser = (u) => ({
  name: u.name,
  email: u.email,
  createdAt: u.created_at,
});

const signToken = (user) =>
  jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- middleware: the "security guard" ----------

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'Please log in first.',
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({
      error: 'Your session expired. Please log in again.',
    });
  }
}

// ---------- app ----------

const app = express();

app.use(express.json({ limit: '10kb' }));

// ---------- SIGNUP ----------

app.post('/api/signup', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    // Validate input
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        error: 'Enter your name (2 to 50 characters).',
      });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({
        error: 'Enter a valid email address.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password needs at least 8 characters.',
      });
    }

    // Check whether email already exists
    const existing = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'That email already has an account. Try logging in.',
      });
    }

    // Hash password before storing it
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user into Neon
    const result = await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${passwordHash})
      RETURNING id, name, email, created_at
    `;

    const user = result[0];

    res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    console.error('Signup error:', err);

    // Handle duplicate email safely
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'That email already has an account. Try logging in.',
      });
    }

    next(err);
  }
});

// ---------- LOGIN ----------

app.post('/api/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const result = await sql`
      SELECT id, name, email, password, created_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    const user = result[0];

    // Check password
    const ok =
      user &&
      (await bcrypt.compare(password, user.password));

    // Same message for invalid email/password
    if (!ok) {
      return res.status(401).json({
        error: 'Email or password is incorrect.',
      });
    }

    res.json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// ---------- WHO AM I? ----------

app.get('/api/me', requireAuth, async (req, res, next) => {
  try {
    const result = await sql`
      SELECT id, name, email, created_at
      FROM users
      WHERE id = ${req.userId}
      LIMIT 1
    `;

    const user = result[0];

    if (!user) {
      return res.status(401).json({
        error: 'Account not found. Please sign up again.',
      });
    }

    res.json({
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// Unknown /api routes
app.use('/api', (req, res) =>
  res.status(404).json({ error: 'Not found.' })
);

// Serve frontend
app.use(
  express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
  })
);

// Central error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Request was not valid JSON.',
    });
  }

  console.error(err);

  res.status(500).json({
    error: 'Something went wrong on our side. Try again.',
  });
});

app.listen(PORT, () => {
  console.log(`E-Cell site running at http://localhost:${PORT}`);
});