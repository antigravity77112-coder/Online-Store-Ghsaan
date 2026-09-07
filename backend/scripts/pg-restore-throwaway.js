#!/usr/bin/env node
/**
 * Restore a Layer 1 .sql.gz into a THROWAWAY database only.
 *
 * Refuses to use DIRECT_URL / DATABASE_URL unless ALLOW_PRODUCTION_RESTORE=YES
 * (still requires CONFIRM_RESTORE=YES). Prefer RESTORE_DATABASE_URL for drills.
 *
 * NEVER point this at production casually.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function argValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

if (process.env.CONFIRM_RESTORE !== 'YES') {
  console.error('Refusing to run. Set CONFIRM_RESTORE=YES after reading docs/BACKUP_AND_RESTORE.md');
  process.exit(1);
}

const file = argValue('--file');
if (!file || !fs.existsSync(file)) {
  console.error('Usage: CONFIRM_RESTORE=YES RESTORE_DATABASE_URL=... node scripts/pg-restore-throwaway.js --file backups/gisaah_pg_....sql.gz');
  process.exit(1);
}

const restoreUrl = process.env.RESTORE_DATABASE_URL;
const prodUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

let targetUrl = restoreUrl;
if (!targetUrl) {
  if (process.env.ALLOW_PRODUCTION_RESTORE === 'YES') {
    targetUrl = prodUrl;
    console.warn('WARNING: Restoring into DIRECT_URL/DATABASE_URL (production-capable).');
  } else {
    console.error('Set RESTORE_DATABASE_URL to a throwaway DB. Live URLs are blocked by default.');
    process.exit(1);
  }
}

if (!targetUrl) {
  console.error('No restore target URL.');
  process.exit(1);
}

const tmpSql = path.join(__dirname, `../backups/_restore_tmp_${Date.now()}.sql`);
const buf = fs.readFileSync(file);
let sqlBuf;
try {
  sqlBuf = zlib.gunzipSync(buf);
} catch {
  sqlBuf = buf;
}
fs.writeFileSync(tmpSql, sqlBuf);

console.log('Restoring into throwaway/target DB via psql...');
const result = spawnSync('psql', [targetUrl, '-v', 'ON_ERROR_STOP=1', '-f', tmpSql], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

try { fs.unlinkSync(tmpSql); } catch { /* ignore */ }

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'psql restore failed');
  process.exit(result.status || 1);
}

console.log('Restore finished.');
