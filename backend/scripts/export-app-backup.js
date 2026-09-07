#!/usr/bin/env node
/**
 * READ-ONLY: export Layer 2 store backup to backend/backups/
 * Does not modify the database.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const backupService = require('../src/services/backupService');

async function main() {
  const outDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = path.join(outDir, `gisaah_backup_${stamp}.json.gz`);

  console.log('Collecting store snapshot (read-only)...');
  const payload = await backupService.buildBackupPayload('export-app-backup.js');
  const gzip = backupService.gzipJson(payload);
  fs.writeFileSync(outFile, gzip);

  if (payload.exchangeRates) {
    const ratesDest = path.join(outDir, `exchange-rates_${stamp}.json`);
    fs.writeFileSync(ratesDest, `${JSON.stringify(payload.exchangeRates, null, 2)}\n`, 'utf8');
    console.log('Wrote rates →', ratesDest);
  }

  console.log('Wrote', outFile, `(${gzip.length} bytes)`);
  console.log('Keep this file secret (includes password hashes). Copy it offsite.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const prisma = require('../src/prismaClient');
      await prisma.$disconnect();
    } catch { /* ignore */ }
  });
