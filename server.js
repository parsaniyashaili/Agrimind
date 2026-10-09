// AgriMind backend: receives enquiries / farm data / questions / feedback and emails them to the owner.
const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MAIL_TO = process.env.MAIL_TO || 'parsaniyashaili@gmail.com';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const DRY_RUN = process.env.DRY_RUN === '1'; // test mode: nothing is really sent
const TYPES = ['Enquiry', 'Farm data', 'Question (Ask AI)', 'Feedback'];

const transporter = DRY_RUN
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
const configured = DRY_RUN || (GMAIL_USER && GMAIL_APP_PASSWORD);

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// simple per-IP rate limit: 40 requests / 10 minutes
const hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 600000);
  list.push(now); hits.set(ip, list);
  return list.length > 40;
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = v => String(v == null ? '' : v).slice(0, 2000);

app.get('/health', (req, res) => res.json({ ok: true, mailConfigured: !!configured }));

app.post('/api/notify', async (req, res) => {
  try {
    if (limited(req.ip)) return res.status(429).json({ ok: false, error: 'Too many requests' });
    if (!configured) return res.status(503).json({ ok: false, error: 'Mail is not configured on the server' });
    const { type, language, data } = req.body || {};
    if (!TYPES.includes(type) || !data || typeof data !== 'object') return res.status(400).json({ ok: false, error: 'Bad request' });

    const d = {};
    Object.keys(data).slice(0, 30).forEach(k => { d[clean(k).slice(0, 60)] = clean(data[k]); });

    if (type === 'Enquiry') {
      if (!d.name || !d.phone || !d.message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || '')) {
        return res.status(400).json({ ok: false, error: 'Name, phone, valid email and message are required' });
      }
    }

    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const rowsHtml = Object.entries({ type, language: clean(language), time, ...d })
      .map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;background:#f3faf5"><b>${esc(k)}</b></td><td style="padding:6px 12px;border:1px solid #ddd">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('');
    const subject = `AgriMind • ${type}${d.name ? ' — ' + d.name : ''}`;

    await transporter.sendMail({
      from: `"AgriMind Website" <${GMAIL_USER || 'agrimind@localhost'}>`,
      to: MAIL_TO,
      replyTo: type === 'Enquiry' ? d.email : undefined,
      subject,
      text: Object.entries({ type, time, ...d }).map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: `<h3>🌱 ${esc(subject)}</h3><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rowsHtml}</table>`
    });

    try { // local backup log (may be temporary on free hosts; the email is your real record)
      fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
      fs.appendFileSync(path.join(__dirname, 'data', 'log.jsonl'), JSON.stringify({ time, type, language, data: d }) + '\n');
    } catch (e) { /* ignore */ }

    res.json({ ok: true });
  } catch (e) {
    console.error('notify failed:', e.message);
    res.status(500).json({ ok: false, error: 'Could not send mail' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`AgriMind running on port ${PORT}${DRY_RUN ? ' (DRY RUN)' : ''}`);
  if (!configured) console.warn('WARNING: set GMAIL_USER and GMAIL_APP_PASSWORD, otherwise no mail can be sent.');
  else if (!DRY_RUN) transporter.verify().then(() => console.log('Gmail login OK'), e => console.error('Gmail login FAILED:', e.message));
});
