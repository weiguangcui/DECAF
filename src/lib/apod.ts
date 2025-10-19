import * as fs from 'node:fs';
import * as path from 'node:path';

const APOD_API = 'https://api.nasa.gov/planetary/apod';

export type ApodInfo = {
  date: string; // YYYY-MM-DD
  media_type: 'image' | 'video' | string;
  url?: string;
  hdurl?: string;
  thumbnail_url?: string;
};

type Manifest = {
  date: string;
  file: string; // relative web path from public root, e.g. /assets/apod/apod.jpg
  lastChecked?: string; // YYYY-MM-DD, last time we attempted an update
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readManifest(manifestPath: string): Manifest | null {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const data = JSON.parse(raw);
    if (data && typeof data.date === 'string' && typeof data.file === 'string') return data as Manifest;
  } catch {}
  return null;
}

function writeManifest(manifestPath: string, m: Manifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));
}

function findExistingApodWebPath(apodDir: string): string | null {
  try {
    const files = fs.readdirSync(apodDir);
    // Prefer a single file named like apod.* (excluding manifest.json)
    const cand = files.find((f) => f !== 'manifest.json' && f.startsWith('apod.') || f === 'apod' || f.startsWith('apod-'));
    if (cand) return `/assets/apod/${cand}`;
  } catch {}
  return null;
}

function pickApodImageUrl(info: ApodInfo): string | null {
  if (info.media_type === 'image') {
    return info.hdurl || info.url || null;
  }
  if (info.media_type === 'video') {
    return info.thumbnail_url || (info as any).hdthumbnail || null;
  }
  return null;
}

function extFromUrl(u: string): string {
  const q = u.split('?')[0];
  const e = path.extname(q).toLowerCase();
  if (e) return e;
  return '.jpg';
}

export async function getOrUpdateApodLocalPath(): Promise<string | null> {
  // Determine locations
  const projectRoot = path.resolve(import.meta.url.replace('file://', ''), '../../..');
  // Resolve to repo root by walking up to find package.json
  let root = projectRoot;
  while (!fs.existsSync(path.join(root, 'package.json'))) {
    const up = path.dirname(root);
    if (up === root) break;
    root = up;
  }
  const publicDir = path.join(root, 'public');
  const apodDir = path.join(publicDir, 'assets', 'apod');
  const manifestPath = path.join(apodDir, 'manifest.json');

  ensureDir(apodDir);

  const API_KEY = (import.meta as any).env?.PUBLIC_NASA_API_KEY || 'DEMO_KEY';
  const url = `${APOD_API}?api_key=${API_KEY}&thumbs=true`;

  let info: ApodInfo | null = null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      info = (await res.json()) as ApodInfo;
    }
  } catch {}

  const manifest = readManifest(manifestPath);

  if (!info) {
    // No fresh info; reuse manifest if available, otherwise fall back to any existing apod.* file
    if (manifest?.file) {
      const existingAbs = path.join(publicDir, manifest.file.replace(/^\//, ''));
      if (fs.existsSync(existingAbs)) return manifest.file;
    }
    const fallback = findExistingApodWebPath(apodDir);
    if (fallback) {
      // Update manifest to reflect the existing file with unknown date
      writeManifest(manifestPath, { date: manifest?.date || 'unknown', file: fallback });
      return fallback;
    }
    return null;
  }

  const imgUrl = pickApodImageUrl(info);
  if (!imgUrl) {
    // No usable image; reuse manifest
    return manifest?.file || null;
  }

  // If date unchanged and we already have a file, reuse it
  if (manifest && manifest.date === info.date && manifest.file) {
    const existingAbs = path.join(publicDir, manifest.file.replace(/^\//, ''));
    if (fs.existsSync(existingAbs)) return manifest.file;
  }

  // Download image and save (single file policy: keep only one 'apod<ext>' file)
  try {
    const resp = await fetch(imgUrl);
    if (!resp.ok) return manifest?.file || null;
    const buf = Buffer.from(await resp.arrayBuffer());
    const ext = extFromUrl(imgUrl);
    const fname = `apod${ext}`;
    const abs = path.join(apodDir, fname);
    fs.writeFileSync(abs, buf);
    const webPath = `/assets/apod/${fname}`;

    // Clean up older files (best-effort)
    try {
      const files = fs.readdirSync(apodDir);
      for (const f of files) {
        if (f.startsWith('apod') && f !== fname && f !== 'manifest.json') {
          try { fs.unlinkSync(path.join(apodDir, f)); } catch {}
        }
      }
    } catch {}

    const today = new Date().toISOString().slice(0, 10);
    writeManifest(manifestPath, { date: info.date, file: webPath, lastChecked: today });
    return webPath;
  } catch {
    return manifest?.file || null;
  }
}

// Return the cached local APOD web path synchronously, without network.
export function getCachedApodLocalPath(): string | null {
  const projectRoot = path.resolve(import.meta.url.replace('file://', ''), '../../..');
  let root = projectRoot;
  while (!fs.existsSync(path.join(root, 'package.json'))) {
    const up = path.dirname(root);
    if (up === root) break;
    root = up;
  }
  const publicDir = path.join(root, 'public');
  const apodDir = path.join(publicDir, 'assets', 'apod');
  const manifestPath = path.join(apodDir, 'manifest.json');
  const manifest = readManifest(manifestPath);
  if (manifest?.file) {
    const abs = path.join(publicDir, manifest.file.replace(/^\//, ''));
    if (fs.existsSync(abs)) return manifest.file;
  }
  const fallback = findExistingApodWebPath(apodDir);
  if (fallback) {
    const today = new Date().toISOString().slice(0, 10);
    writeManifest(manifestPath, { date: manifest?.date || 'unknown', file: fallback, lastChecked: manifest?.lastChecked || today });
    return fallback;
  }
  return null;
}

// Fire-and-forget: if we haven't checked today, attempt an update asynchronously.
export function triggerApodUpdateIfNeeded(): void {
  void (async () => {
    const projectRoot = path.resolve(import.meta.url.replace('file://', ''), '../../..');
    let root = projectRoot;
    while (!fs.existsSync(path.join(root, 'package.json'))) {
      const up = path.dirname(root);
      if (up === root) break;
      root = up;
    }
    const publicDir = path.join(root, 'public');
    const apodDir = path.join(publicDir, 'assets', 'apod');
    const manifestPath = path.join(apodDir, 'manifest.json');
    ensureDir(apodDir);

    const today = new Date().toISOString().slice(0, 10);
    const manifest = readManifest(manifestPath);
    if (manifest?.lastChecked === today) return; // already checked today

    const API_KEY = (import.meta as any).env?.PUBLIC_NASA_API_KEY || 'DEMO_KEY';
    const url = `${APOD_API}?api_key=${API_KEY}&thumbs=true`;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        writeManifest(manifestPath, { date: manifest?.date || 'unknown', file: manifest?.file || findExistingApodWebPath(apodDir) || '', lastChecked: today });
        return;
      }
      const info = (await res.json()) as ApodInfo;
      const imgUrl = pickApodImageUrl(info);
      if (!imgUrl) {
        writeManifest(manifestPath, { date: manifest?.date || 'unknown', file: manifest?.file || findExistingApodWebPath(apodDir) || '', lastChecked: today });
        return;
      }
      const resp = await fetch(imgUrl);
      if (!resp.ok) {
        writeManifest(manifestPath, { date: manifest?.date || 'unknown', file: manifest?.file || findExistingApodWebPath(apodDir) || '', lastChecked: today });
        return;
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      const ext = extFromUrl(imgUrl);
      const fname = `apod${ext}`;
      const abs = path.join(apodDir, fname);
      fs.writeFileSync(abs, buf);
      const webPath = `/assets/apod/${fname}`;
      try {
        const files = fs.readdirSync(apodDir);
        for (const f of files) {
          if (f.startsWith('apod') && f !== fname && f !== 'manifest.json') {
            try { fs.unlinkSync(path.join(apodDir, f)); } catch {}
          }
        }
      } catch {}
      writeManifest(manifestPath, { date: info.date, file: webPath, lastChecked: today });
    } catch {
      writeManifest(manifestPath, { date: manifest?.date || 'unknown', file: manifest?.file || findExistingApodWebPath(apodDir) || '', lastChecked: today });
    }
  })();
}
