#!/usr/bin/env node
/**
 * Layer 1: pg_dump via DIRECT_URL (session pooler / direct).
 * READ-ONLY against the database. Requires pg_dump on PATH.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error('Missing DIRECT_URL (or DATABASE_URL) in backend/.env');
  process.exit(1);
}

if (directUrl.includes(':6543')) {
  console.warn('Warning: URL uses port 6543 (transaction pooler). Prefer DIRECT_URL on 5432 for pg_dump.');
}

const outDir = path.join(__dirname, '../backups');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const sqlPath = path.join(outDir, `gisaah_pg_${stamp}.sql`);
const gzPath = `${sqlPath}.gz`;

console.log('Running pg_dump (read-only)...');
const result = spawnSync(
  'pg_dump',
  [
    directUrl,
    '--no-owner',
    '--no-acl',
    '--format=plain',
    `--file=${sqlPath}`,
  ],
  { encoding: 'utf8', shell: process.platform === 'win32' },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'pg_dump failed');
  console.error('Install PostgreSQL client tools and ensure pg_dump is on PATH.');
  process.exit(result.status || 1);
}

const sql = fs.readFileSync(sqlPath);
fs.writeFileSync(gzPath, zlib.gzipSync(sql));
fs.unlinkSync(sqlPath);

console.log('Wrote', gzPath, `(${fs.statSync(gzPath).size} bytes)`);
console.log('Copy this file offsite (Drive / NAS). Do not rely on this folder alone.');
