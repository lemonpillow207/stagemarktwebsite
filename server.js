const express = require('express');
const QRCode  = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const crypto  = require('crypto');

const app       = express();
const PORT      = 3000;
const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'registrations.json');
const VIEWS_DIR = path.join(__dirname, 'views');

// Load .env
(function loadEnv() {
  try {
    fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
      .split('\n')
      .forEach(line => {
        const [k, ...v] = line.split('=');
        if (k && v.length) process.env[k.trim()] = v.join('=').trim();
      });
  } catch {}
})();

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR,  { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
if (!fs.existsSync(VIEWS_DIR)) fs.mkdirSync(VIEWS_DIR, { recursive: true });

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const VALID_TOKEN = crypto
  .createHmac('sha256', 'korton-stagemarkt-salt')
  .update(ADMIN_PASSWORD)
  .digest('hex');

function parseCookies(str) {
  const out = {};
  str.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) out[k.trim()] = decodeURIComponent(v.join('='));
  });
  return out;
}

function isAuthenticated(req) {
  return parseCookies(req.headers.cookie || '').k_admin === VALID_TOKEN;
}

app.use(express.json());

app.use((req, res, next) => {
  if (path.basename(req.path).startsWith('.')) return res.status(404).end();
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny' }));

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets))
    for (const net of nets[name])
      if (net.family === 'IPv4' && !net.internal) return net.address;
  return 'localhost';
}

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

// ── Auth ──────────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const token = crypto
    .createHmac('sha256', 'korton-stagemarkt-salt')
    .update(password || '')
    .digest('hex');
  if (token === VALID_TOKEN) {
    res.setHeader('Set-Cookie', `k_admin=${VALID_TOKEN}; HttpOnly; Max-Age=86400; Path=/`);
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Verkeerd wachtwoord' });
  }
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'k_admin=; HttpOnly; Max-Age=0; Path=/');
  res.json({ success: true });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/beheer', (req, res) => {
  if (isAuthenticated(req)) {
    res.sendFile(path.join(VIEWS_DIR, 'admin.html'));
  } else {
    res.redirect('/login.html');
  }
});

// ── API ───────────────────────────────────────────────────────────

app.get('/api/qrcode', async (req, res) => {
  try {
    const ip  = getLocalIP();
    const url = `http://${ip}:${PORT}/form.html`;
    const qrcode = await QRCode.toDataURL(url, {
      width: 600, margin: 1,
      color: { dark: '#111111', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
    res.json({ qrcode, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', (req, res) => {
  try {
    const { naam, email, mobiel, opleiding, leerjaar } = req.body;
    if (!naam || !email || !mobiel || !opleiding || !leerjaar)
      return res.status(400).json({ error: 'Vul alle velden in.' });
    const regs = readData();
    regs.push({ id: uuidv4(), naam, email, mobiel, opleiding, leerjaar, timestamp: new Date().toISOString() });
    fs.writeFileSync(DATA_FILE, JSON.stringify(regs, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/registrations', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Niet ingelogd' });
  res.json(readData());
});

app.delete('/api/registrations/:id', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Niet ingelogd' });
  try {
    const regs = readData();
    const filtered = regs.filter(r => r.id !== req.params.id);
    if (filtered.length === regs.length)
      return res.status(404).json({ error: 'Niet gevonden' });
    fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/count', (req, res) => {
  res.json({ count: readData().length });
});

app.post('/api/draw', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Niet ingelogd' });
  const regs = readData();
  if (!regs.length) return res.status(400).json({ error: 'Geen aanmeldingen om uit te loten' });
  const winner = regs[Math.floor(Math.random() * regs.length)];
  res.json({ winner });
});

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   KORTON STAGEMARKT  –  Server gestart    ║');
  console.log('╚═══════════════════════════════════════════╝\n');
  console.log(`  📺  Display:    http://localhost:${PORT}`);
  console.log(`  📱  Formulier:  http://${ip}:${PORT}/form.html`);
  console.log(`  📊  Beheer:     http://localhost:${PORT}/beheer`);
  console.log(`\n  🔑  Wachtwoord: ${ADMIN_PASSWORD}`);
  console.log(`  ✅  QR code  →  http://${ip}:${PORT}/form.html\n`);
});
