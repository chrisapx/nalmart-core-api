#!/usr/bin/env node
'use strict';
require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const tpl = (name) => fs.readFileSync(path.join(process.cwd(), 'src/templates/emails', name), 'utf-8');
const render = (t, v) => t.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k) => v[k] || '');

const tr = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

const V = {
  FIRST_NAME:    'Chris',
  CODE:          '847291',
  RESET_URL:     'http://localhost:8080/reset-password?token=abc123testtoken',
  SUPPORT_EMAIL: process.env.SMTP_USER,
  STORE_NAME:    'Nalmart',
  YEAR:          '2026',
};

const FROM = process.env.EMAIL_FROM;
const TO   = 'mcaplexya@gmail.com';

Promise.resolve()
  .then(() => tr.sendMail({ from: FROM, to: TO, subject: 'Verify Your Nalmart Account', html: render(tpl('verify-email.html'), V) }))
  .then(() => { console.log('1/3 verify-email ✓'); return tr.sendMail({ from: FROM, to: TO, subject: 'Reset Your Nalmart Password', html: render(tpl('reset-password.html'), V) }); })
  .then(() => { console.log('2/3 reset-password ✓'); return tr.sendMail({ from: FROM, to: TO, subject: 'Your Nalmart Login Code', html: render(tpl('login-otp.html'), V) }); })
  .then(() => { console.log('3/3 login-otp ✓\nDone.'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
