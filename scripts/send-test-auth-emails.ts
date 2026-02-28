import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

function tplDir(): string {
  const here = path.join(__dirname, '../src/templates/emails');
  if (fs.existsSync(here)) return here;
  return path.join(process.cwd(), 'src/templates/emails');
}
function loadTpl(name: string): string {
  return fs.readFileSync(path.join(tplDir(), name), 'utf-8');
}
function renderTpl(t: string, v: Record<string, string>): string {
  return t.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_: string, k: string) => v[k] ?? '');
}

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.zoho.com',
  port:   parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth:   { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASSWORD || '' },
});

const VARS: Record<string, string> = {
  FIRST_NAME:    'Chris',
  CODE:          '847 291',
  RESET_URL:     'http://localhost:8080/reset-password?token=abc123testtokenxyz',
  SUPPORT_EMAIL: process.env.SMTP_USER || 'support@nalmart.com',
  STORE_NAME:    process.env.STORE_NAME || 'Nalmart',
  YEAR:          '2026',
};

async function main(): Promise<void> {
  console.log('\nSending auth test emails to mcaplexya@gmail.com…\n');
  const tests = [
    { label: '1/3  Verify Email',   file: 'verify-email.html',   subj: 'Verify Your Nalmart Account' },
    { label: '2/3  Reset Password', file: 'reset-password.html', subj: 'Reset Your Nalmart Password' },
    { label: '3/3  Login OTP',      file: 'login-otp.html',      subj: 'Your Nalmart Login Code' },
  ];
  for (const t of tests) {
    process.stdout.write(`  ${t.label} … `);
    const html = renderTpl(loadTpl(t.file), VARS);
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || `"Nalmart" <${process.env.SMTP_USER}>`,
      to:      'mcaplexya@gmail.com',
      subject: t.subj,
      html,
    });
    console.log('✓');
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log('\nDone. Check mcaplexya@gmail.com\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
