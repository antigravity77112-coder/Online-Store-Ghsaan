const fs = require('fs');
const path = require('path');
const prisma = require('../prismaClient');

const GLOBAL_ID = 'global';

const LEGACY_RATES_FILE = process.env.VERCEL
  ? '/tmp/exchange-rates.json'
  : path.join(__dirname, '../../data/exchange-rates.json');

const DEFAULT_RATES = {
  USD_to_YER_Sanaa: 550,
  USD_to_YER_Aden: 1700,
  USD_to_SAR: 3.75,
};

function normalizeRates(raw = {}) {
  return {
    USD_to_YER_Sanaa: Number(raw.USD_to_YER_Sanaa) || DEFAULT_RATES.USD_to_YER_Sanaa,
    USD_to_YER_Aden: Number(raw.USD_to_YER_Aden) || DEFAULT_RATES.USD_to_YER_Aden,
    USD_to_SAR: Number(raw.USD_to_SAR) || DEFAULT_RATES.USD_to_SAR,
  };
}

function readLegacyFileRates() {
  try {
    if (!fs.existsSync(LEGACY_RATES_FILE)) return null;
    return normalizeRates(JSON.parse(fs.readFileSync(LEGACY_RATES_FILE, 'utf8')));
  } catch {
    return null;
  }
}

async function ensureGlobalRow() {
  let row = await prisma.systemSetting.findUnique({ where: { id: GLOBAL_ID } });
  if (!row) {
    row = await prisma.systemSetting.create({ data: { id: GLOBAL_ID } });
  }
  return row;
}

/**
 * Returns display exchange rates from DB.
 * One-time: if unset, seeds from legacy JSON file (or defaults) into SystemSetting.
 */
async function getExchangeRates() {
  const row = await ensureGlobalRow();
  if (row.exchangeRates && typeof row.exchangeRates === 'object') {
    return normalizeRates(row.exchangeRates);
  }

  const seeded = readLegacyFileRates() || { ...DEFAULT_RATES };
  await prisma.systemSetting.update({
    where: { id: GLOBAL_ID },
    data: { exchangeRates: seeded },
  });
  return seeded;
}

async function updateExchangeRates(rates) {
  const next = normalizeRates(rates);
  await prisma.systemSetting.upsert({
    where: { id: GLOBAL_ID },
    update: { exchangeRates: next },
    create: { id: GLOBAL_ID, exchangeRates: next },
  });
  return next;
}

module.exports = {
  DEFAULT_RATES,
  normalizeRates,
  getExchangeRates,
  updateExchangeRates,
};
