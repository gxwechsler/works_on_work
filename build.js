#!/usr/bin/env node

/**
 * build.js — works_on_work static site generator
 * Purpose: Build single-site SPA from JSON content and HTML template
 * Created: 2026-02-09
 *
 * Zero external dependencies. Node.js built-ins only.
 * Reads content from content/, injects into templates/, outputs to dist/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');

// ─── Utilities ───────────────────────────────────────────────

function cleanDir(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  fs.mkdirSync(p, { recursive: true });
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDirSync(s, d) : fs.copyFileSync(s, d);
  }
}

function readJSON(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return fallback; }
}

// ─── Content ─────────────────────────────────────────────────

function readPosts() {
  const dir = path.join(ROOT, 'content', 'posts');
  if (!fs.existsSync(dir)) return [];
  const posts = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    try {
      posts.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
    } catch (e) {
      console.warn(`  ⚠  ${f}: ${e.message}`);
    }
  }
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

function injectData(html) {
  const posts = readPosts();
  const unlinked = readJSON(path.join(ROOT, 'content', 'unlinked-comments.json'), []);
  const about = readJSON(path.join(ROOT, 'content', 'about.json'), { en: '', es: '' });
  const site = readJSON(path.join(ROOT, 'content', 'site.json'), {});

  console.log(`  Found ${posts.length} post(s)`);

  return html
    .replace('/*__POSTS_JSON__*/', JSON.stringify(posts, null, 2))
    .replace('/*__UNLINKED_JSON__*/', JSON.stringify(unlinked, null, 2))
    .replace('/*__ABOUT_JSON__*/', JSON.stringify(about, null, 2))
    .replace('/*__CONTACT_EMAIL__*/', site.contact_email || '');
}

// ─── Build ───────────────────────────────────────────────────

function build() {
  const start = Date.now();
  console.log('works_on_work — build started');
  cleanDir(DIST_DIR);

  // SPA: templates/index.html → dist/index.html
  const tpl = path.join(ROOT, 'templates', 'index.html');
  if (!fs.existsSync(tpl)) {
    console.error('  ✗ templates/index.html not found — aborting');
    process.exit(1);
  }

  let html = fs.readFileSync(tpl, 'utf-8');
  html = injectData(html);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html);
  console.log('  ✓ index.html');

  // Assets
  const assetsDir = path.join(ROOT, 'assets');
  if (fs.existsSync(assetsDir)) {
    copyDirSync(assetsDir, path.join(DIST_DIR, 'assets'));
    console.log('  ✓ assets/');
  }

  // CNAME for GitHub Pages custom domain
  const cname = path.join(ROOT, 'CNAME');
  if (fs.existsSync(cname)) {
    fs.copyFileSync(cname, path.join(DIST_DIR, 'CNAME'));
    console.log('  ✓ CNAME');
  }

  console.log(`\n━━━ Build complete in ${((Date.now() - start) / 1000).toFixed(2)}s ━━━\n`);
}

build();
