import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const matter = require('gray-matter');

export type EventInfo = {
  dir: string; // YYYY-MM-DD
  mdPath: string;
  imagePath?: string | null; // web path starting with '/'
  content?: string; // raw markdown content
  title?: string | null;
  speaker?: string | null;
  affiliation?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  excerpt?: string | null;
  slidesUrl?: string | null; // URL to presentation slides
  videoUrl?: string | null;  // URL to recorded video
};

function resolveFirstExistingDir(urls: URL[]): string | null {
  for (const u of urls) {
    const p = u.pathname;
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
  }
  return null;
}

function makeExcerpt(text: string, maxLen = 220): string {
  const t = text.replace(/\r/g, '').trim();
  if (!t) return '';
  const para = t.split('\n\n')[0] || t;
  return para.length > maxLen ? para.slice(0, maxLen).trimEnd() + '…' : para;
}

function getEventDirs(baseDir: string): string[] {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

function findMarkdownFile(dirPath: string): string | null {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  const md = files.find((f) => f.isFile() && /\.mdx?$/.test(f.name));
  return md ? path.join(dirPath, md.name) : null;
}

function findImageFile(dirPath: string): string | null {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  const img = files.find((f) =>
    f.isFile() && /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name)
  );
  return img ? path.join(dirPath, img.name) : null;
}

function toWebPathFromPublic(absPath: string): string | null {
  const parts = absPath.split(path.sep);
  const idx = parts.lastIndexOf('public');
  if (idx === -1) return null;
  const relParts = parts.slice(idx + 1);
  const web = '/' + relParts.join('/');
  return web;
}

function normalizePosterUrl(mdDir: string, posterUrl: string): string | null {
  if (!posterUrl) return null;
  const u = posterUrl.trim();
  if (!u) return null;
  // Full URL (including protocol-relative URLs)
  if (/^https?:\/\//i.test(u) || u.startsWith('//')) return u;
  // If path includes /public/, convert to web root path
  const pubIdx = u.indexOf('/public/');
  if (pubIdx !== -1) {
    return u.slice(pubIdx + '/public'.length);
  }
  // If it starts with './' or '../', resolve relative to mdDir and then map from public
  if (u.startsWith('./') || u.startsWith('../')) {
    const abs = path.resolve(mdDir, u);
    return toWebPathFromPublic(abs);
  }
  // If it starts with '/', assume it's already a web path
  if (u.startsWith('/')) return u;
  // Otherwise, try to resolve relative to mdDir
  const abs = path.resolve(mdDir, u);
  return toWebPathFromPublic(abs);
}

function normalizeUrl(baseDir: string, url: string | undefined, mdDir: string): string | null {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;

  // If it's an absolute URL, return as is
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('//')) {
    return u;
  }

  // If path includes /public/, convert to web root path
  const pubIdx = u.indexOf('/public/');
  if (pubIdx !== -1) {
    return u.slice(pubIdx + '/public'.length);
  }

  // If it's a path starting with '/', it's already a web path
  if (u.startsWith('/')) {
    return u.startsWith('/DECAF/') ? u : `/DECAF${u}`;
  }

  // For relative paths, resolve them relative to the markdown file's directory
  const absPath = path.resolve(mdDir, u);
  const webPath = toWebPathFromPublic(absPath);

  // Ensure the path starts with /DECAF/
  return webPath?.startsWith('/DECAF/') ? webPath : `/DECAF${webPath || ''}`;
}

function parseEvent(baseDir: string, dirName: string): EventInfo | null {
  const full = path.join(baseDir, dirName);
  const mdPath = findMarkdownFile(full);
  if (!mdPath) return null;
  const imgAbs = findImageFile(full);
  const mdDir = path.dirname(mdPath);
  
  try {
    const raw = fs.readFileSync(mdPath, 'utf-8');
    const { data, content } = matter(raw);
    
    // Process poster URL
    let imagePath: string | null = null;
    if (typeof data.posterUrl === 'string') {
      imagePath = normalizePosterUrl(mdDir, data.posterUrl);
    }
    if (!imagePath && imgAbs) {
      imagePath = toWebPathFromPublic(imgAbs);
      if (imagePath && !imagePath.startsWith('/DECAF/')) {
        imagePath = `/DECAF${imagePath}`;
      }
    }
    return {
      dir: dirName,
      mdPath,
      imagePath,
      content,
      title: (data.title as string) || null,
      speaker: (data.speaker as string) || (data.name as string) || null,
      affiliation: (data.affiliation as string) || null,
      date: (data.date as string) || dirName,
      time: (data.time as string) || null,
      location: (data.location as string) || null,
      excerpt: makeExcerpt(content),
      slidesUrl: normalizeUrl(baseDir, data.slides, mdDir),
      videoUrl: normalizeUrl(baseDir, data.video, mdDir),
    } as EventInfo;
  } catch {
    return null;
  }
}

function getBaseDir(): string | null {
  const candidates = [
    new URL('../../public/blog/', import.meta.url),
    new URL('../../public/assets/blog/', import.meta.url),
  ];
  return resolveFirstExistingDir(candidates);
}

export async function getLatestEvent(): Promise<EventInfo | null> {
  const baseDir = getBaseDir();
  if (!baseDir) return null;
  const dirs = getEventDirs(baseDir);
  const events: (EventInfo & { __date?: Date | null })[] = [];
  for (const d of dirs) {
    const ev = parseEvent(baseDir, d);
    if (ev) {
      const ds = (ev.date || ev.dir || '').trim();
      const dt = ds ? new Date(ds) : null;
      events.push(Object.assign(ev, { __date: dt && !isNaN(dt.getTime()) ? dt : null }));
    }
  }
  if (!events.length) return null;

  // Today at 00:00 for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Nearest upcoming: date >= today, sort asc
  const upcoming = events
    .filter(e => e.__date && e.__date >= today)
    .sort((a, b) => (a.__date as Date).getTime() - (b.__date as Date).getTime());
  if (upcoming.length) return upcoming[0];

  // Fallback: most recent past, sort desc
  const past = events
    .filter(e => e.__date && e.__date < today)
    .sort((a, b) => (b.__date as Date).getTime() - (a.__date as Date).getTime());
  return past.length ? past[0] : events[0];
}

export async function getAllEvents(): Promise<EventInfo[]> {
  const baseDir = getBaseDir();
  if (!baseDir) return [];
  const dirs = getEventDirs(baseDir);
  const events: EventInfo[] = [];
  for (const d of dirs) {
    const ev = parseEvent(baseDir, d);
    if (ev) events.push(ev);
  }
  return events;
}

export async function getPastEvents(limit?: number): Promise<EventInfo[]> {
  const all = await getAllEvents();
  const past = all.slice(1); // exclude latest
  return typeof limit === 'number' ? past.slice(0, limit) : past;
}
