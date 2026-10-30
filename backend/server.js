const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT) || 4000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'replace_with_long_random_secret';
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec';

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(session({
  name: 'sstc_admin_sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60
  }
}));

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

async function fetchGoogleScript(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params });
  const url = `${GOOGLE_SCRIPT_URL}?${qs.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Google Script returned ${response.status}`);
  }

  return response.json();
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  if (!ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH === 'replace_with_bcrypt_hash') {
    return res.status(500).json({ success: false, message: 'Admin backend not configured.' });
  }

  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const valid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  req.session.user = { username: ADMIN_USERNAME };
  return res.json({ success: true, message: 'Login successful.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sstc_admin_sid');
    res.json({ success: true, message: 'Logged out.' });
  });
});

app.get('/api/admin/check', requireAuth, (req, res) => {
  res.json({ success: true, authenticated: true, user: req.session.user });
});

app.get('/api/admin/students', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('getStudents');
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to fetch students.' });
  }
});

app.get('/api/admin/rentals', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('getallrentals');
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to fetch rentals.' });
  }
});

app.get('/api/admin/notes-rentals', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('getallnotesrentals');
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to fetch notes rentals.' });
  }
});

app.get('/api/admin/update-status', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('updateStatus', {
      studentId: String(req.query.studentId || ''),
      status: String(req.query.status || '')
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to update status.' });
  }
});

app.get('/api/admin/delete-student', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('deleteStudent', {
      studentId: String(req.query.studentId || '')
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to delete student.' });
  }
});

app.get('/api/admin/update-rental-status', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('updaterentalstatus', {
      rentalId: String(req.query.rentalId || ''),
      status: String(req.query.status || '')
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to update rental status.' });
  }
});

app.get('/api/admin/delete-rental', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('deleterentaladmin', {
      rentalId: String(req.query.rentalId || '')
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to delete rental.' });
  }
});

app.get('/api/admin/update-notes-rental-status', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('updatenotesrentalstatus', {
      rentalId: String(req.query.rentalId || ''),
      status: String(req.query.status || '')
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to update notes rental status.' });
  }
});

app.get('/api/admin/delete-notes-rental', requireAuth, async (req, res) => {
  try {
    const data = await fetchGoogleScript('deletenotesrentaladmin', {
      rentalId: String(req.query.rentalId || '')
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to delete notes rental.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found.' });
});

app.listen(port, () => {
  console.log(`SSTC secure backend running on http://localhost:${port}`);
});
