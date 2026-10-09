# AgriMind backend (sends every enquiry / farm data / AI question / feedback to your Gmail)

The server serves the website (`public/index.html`) AND the mail API (`POST /api/notify`).
Deploy this one folder and you get both. Nothing secret is ever put in the HTML.

## 1. Get a Gmail App Password (2 minutes)
1. Open https://myaccount.google.com/security and turn ON "2-Step Verification".
2. Open https://myaccount.google.com/apppasswords, create an app password named "AgriMind".
3. Copy the 16-letter password. (It is not your normal Gmail password.)

## 2. Deploy free on Render
1. Put this folder on GitHub (do NOT upload a `.env` file).
2. On https://render.com: New + > Web Service > pick the repo.
3. Build command: `npm install`   Start command: `npm start`
4. Environment variables:
   - `GMAIL_USER` = parsaniyashaili@gmail.com
   - `GMAIL_APP_PASSWORD` = the 16-letter app password
   - `MAIL_TO` = parsaniyashaili@gmail.com
5. Open the Render URL. That is your live site. Send a test enquiry; the mail reaches your inbox (check Spam once).

Free Render sleeps after inactivity, so the first request can take ~30 seconds.

## Run on your own computer
```
npm install
cp .env.example .env   # then fill it, or set the variables in your shell
GMAIL_USER=... GMAIL_APP_PASSWORD=... npm start
```
Open http://localhost:3000. Use `DRY_RUN=1 npm start` to test without sending real mail.

## Notes
- The page shows "Mail sent" only when this server confirms Gmail accepted the mail.
- `data/log.jsonl` is a backup log; on free hosts it can be wiped, your inbox is the real record.
- Gmail allows about 500 mails/day. Each farm entry and AI question also sends one mail.
