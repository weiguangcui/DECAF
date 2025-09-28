#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const matter = require('gray-matter');

function log(...args) { console.log('[notify]', ...args); }
function err(...args) { console.error('[notify]', ...args); }

const ROOT = process.cwd();
const EVENTS_DIR = path.join(ROOT, 'public', 'assets', 'blog');
const SITE_URL = process.env.SITE_URL || 'https://weiguangcui.github.io/DECAF/';
const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY || '';

function getDiffAddedFiles(base, head) {
  const range = `${base}..${head}`;
  const cmd = `git diff --name-status ${range}`;
  const out = execSync(cmd, { encoding: 'utf8' });
  const lines = out.split('\n').filter(Boolean);
  const added = lines
    .map((l) => l.trim().split(/\s+/))
    .filter((parts) => parts[0] === 'A' && parts[1])
    .map((parts) => parts[1]);
  return added;
}

function findNewEventDirs(addedFiles) {
  const re = /^public\/assets\/blog\/(\d{4}-\d{2}-\d{2})\/info\.mdx?$/;
  const dirs = new Set();
  for (const f of addedFiles) {
    const m = f.match(re);
    if (m) dirs.add(m[1]);
  }
  return Array.from(dirs).sort();
}

function readEvent(dirName) {
  const mdPath = path.join(EVENTS_DIR, dirName, 'info.md');
  const mdxPath = path.join(EVENTS_DIR, dirName, 'info.mdx');
  const file = fs.existsSync(mdPath) ? mdPath : (fs.existsSync(mdxPath) ? mdxPath : null);
  if (!file) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);
  const title = data.title || dirName;
  const speaker = data.speaker || data.name || '';
  const affiliation = data.affiliation || '';
  const date = data.date || dirName;
  const time = data.time || '';
  const location = data.location || '';
  const excerpt = content.split(/\n\n+/)[0]?.trim() || '';
  return { dir: dirName, title, speaker, affiliation, date, time, location, excerpt };
}

async function sendButtondownEmail(ev) {
  if (!BUTTONDOWN_API_KEY) return { ok: false, skipped: true, reason: 'No BUTTONDOWN_API_KEY' };
  const fetchFn = globalThis.fetch ? globalThis.fetch.bind(globalThis) : (await import('node-fetch')).default;
  const subject = `New Event: ${ev.title}`;
  const link = new URL(`blog#${encodeURIComponent(ev.dir)}`, SITE_URL).toString();
  const lines = [];
  lines.push(`Title: ${ev.title}`);
  if (ev.speaker) lines.push(`Speaker: ${ev.speaker}${ev.affiliation ? ` (${ev.affiliation})` : ''}`);
  lines.push(`Date: ${ev.date}${ev.time ? ` • ${ev.time}` : ''}`);
  if (ev.location) lines.push(`Location: ${ev.location}`);
  lines.push('');
  lines.push(ev.excerpt || '');
  lines.push('');
  lines.push(`Read more: ${link}`);
  const body = lines.join('\n');

  const res = await fetchFn('https://api.buttondown.email/v1/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${BUTTONDOWN_API_KEY}`,
    },
    body: JSON.stringify({ subject, body, publish: true })
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, skipped: false, status: res.status, body: text };
  }
  return { ok: true };
}

async function main() {
  const base = process.argv[2] || process.env.BASE_SHA || process.env.GITHUB_EVENT_BEFORE;
  const head = process.argv[3] || process.env.HEAD_SHA || process.env.GITHUB_SHA;
  if (!base || !head) {
    err('Missing SHAs. Provide BASE and HEAD.');
    process.exit(1);
  }

  log('Comparing', base, '->', head);
  const addedFiles = getDiffAddedFiles(base, head);
  const newDirs = findNewEventDirs(addedFiles);
  if (!newDirs.length) {
    log('No new event directories detected. Exiting.');
    return;
  }
  log('New event directories:', newDirs.join(', '));

  const events = newDirs.map(readEvent).filter(Boolean);
  if (!events.length) {
    log('No readable events found for new directories. Exiting.');
    return;
  }

  let anyErrors = false;
  for (const ev of events) {
    log('Sending notification for', ev.dir, ev.title);
    if (BUTTONDOWN_API_KEY) {
      const res = await sendButtondownEmail(ev);
      if (!res.ok && !res.skipped) {
        anyErrors = true;
        err('Failed to send', ev.dir, res);
      } else if (res.skipped) {
        log('Skipped send (no API key)');
      } else {
        log('Sent');
      }
    } else {
      // Dry-run
      log('(dry-run) Would send email for', ev.dir, ev.title);
    }
  }

  if (anyErrors) process.exit(2);
}

main().catch((e) => { err(e); process.exit(1); });
