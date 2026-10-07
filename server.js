// ---------------------------------------------------------------
// E-Cell SMVIT: backend
// Job of this file: serve the website + provide 3 API endpoints
//   POST /api/signup  -> create an account
//   POST /api/login   -> check credentials, hand out a token
//   GET  /api/me      -> (protected) return the logged-in user
// ---------------------------------------------------------------
require('dotenv').config(); // loads values from the .env file into process.env

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Copy .env.example to .env and set one.');
}

// ---------- tiny "database": a JSON file ----------
// Why not MongoDB? Zero setup for a beginner, and the logic is identical.
// To swap in a real DB later, only these two functions need to change.
const DB_FILE = path.join(__dirname, 'data', 'users.json');

async function readUsers() {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return []; // file doesn't exist yet = no users yet
    throw err;
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(users, null, 2));
}

// ---------- helpers ----------
// Never send the password hash to the browser. Only these fields leave the server.
const publicUser = (u) => ({ name: u.name, email: u.email, createdAt: u.createdAt });

const signToken = (user) => jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- middleware: the "security guard" ----------
// Runs before protected routes. No valid token = request stops here with 401.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''; // looks like: "Bearer eyJhbGci..."
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in first.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET); // throws if fake or expired
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Your session expired. Please log in again.' });
  }
}

// ---------- app ----------
const app = express();
app.use(express.json({ limit: '10kb' })); // lets us read JSON bodies; small limit blocks abuse

// SIGNUP
app.post('/api/signup', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    // Never trust the browser: validate again on the server.
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ error: 'Enter your name (2 to 50 characters).' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password needs at least 8 characters.' });
    }

    const users = await readUsers();
    if (users.some((u) => u.email === email)) {
      return res.status(409).json({ error: 'That email already has an account. Try logging in.' });
    }

    // Hash = one-way scramble. We store the hash, never the real password.
    // The "10" is the cost: higher = slower to crack, but slower for us too.
    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    await writeUsers(users);

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// LOGIN
app.post('/api/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const users = await readUsers();
    const user = users.find((u) => u.email === email);

    // bcrypt.compare hashes the typed password and checks it against the stored hash.
    const ok = user && (await bcrypt.compare(password, user.passwordHash));

    // Same message for "no such email" and "wrong password" so attackers
    // can't use this form to discover which emails are registered.
    if (!ok) return res.status(401).json({ error: 'Email or password is incorrect.' });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// WHO AM I? (protected: requireAuth runs first)
app.get('/api/me', requireAuth, async (req, res, next) => {
  try {
    const users = await readUsers();
    const user = users.find((u) => u.id === req.userId);
    if (!user) return res.status(401).json({ error: 'Account not found. Please sign up again.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// Unknown /api routes get a JSON 404 instead of an HTML page.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Serve the frontend. { extensions: ['html'] } makes /login open login.html.
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Central error handler: anything thrown above ends up here.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request was not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

app.listen(PORT, () => console.log(`E-Cell site running at http://localhost:${PORT}`));
