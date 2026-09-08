const prisma = require('../prismaClient');
const {
  mergeRecord,
  toPublicConfig,
  mergeTheme,
  mergeHomepage,
} = require('../config/siteConfigDefaults');

const GLOBAL_ID = 'global';
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedPublicWeb = null;
let cachedPublicMobile = null;
let cacheExpiresWeb = 0;
let cacheExpiresMobile = 0;

function invalidateCache() {
  cachedPublicWeb = null;
  cachedPublicMobile = null;
  cacheExpiresWeb = 0;
  cacheExpiresMobile = 0;
}

async function ensureGlobalRow() {
  let row = await prisma.systemSetting.findUnique({ where: { id: GLOBAL_ID } });
  if (!row) {
    row = await prisma.systemSetting.create({ data: { id: GLOBAL_ID } });
  }
  return row;
}

async function getMergedSettings() {
  const row = await ensureGlobalRow();
  return mergeRecord(row);
}

async function getPublicConfig(client = 'web') {
  const isMobile = client === 'mobile';
  const now = Date.now();

  if (isMobile) {
    if (cachedPublicMobile && now < cacheExpiresMobile) {
      return cachedPublicMobile;
    }
    const merged = await getMergedSettings();
    cachedPublicMobile = toPublicConfig(merged, { client: 'mobile' });
    cacheExpiresMobile = now + CACHE_TTL_MS;
    return cachedPublicMobile;
  }

  if (cachedPublicWeb && now < cacheExpiresWeb) {
    return cachedPublicWeb;
  }
  const merged = await getMergedSettings();
  cachedPublicWeb = toPublicConfig(merged, { client: 'web' });
  cacheExpiresWeb = now + CACHE_TTL_MS;
  return cachedPublicWeb;
}

async function getAdminConfig() {
  const merged = await getMergedSettings();
  return {
    ...merged,
    public: toPublicConfig(merged, { client: 'web' }),
    publicMobile: toPublicConfig(merged, { client: 'mobile' }),
  };
}

/** Fields writable via admin config update */
const WRITABLE_SCALAR_FIELDS = [
  'aboutUsText', 'contactEmail', 'contactPhone', 'shippingOfferText',
  'facebookUrl', 'twitterUrl', 'whatsappUrl', 'instagramUrl', 'tiktokUrl',
  'telegramUrl', 'linkedinUrl', 'threadsUrl',
  'seoTitle', 'seoDescription',
  'siteName', 'siteShortName', 'appName', 'tagline', 'siteDescription', 'copyrightText',
  'logoUrl', 'logoDarkUrl', 'logoMobileUrl', 'logoMobileDarkUrl', 'faviconUrl', 'ogImageUrl',
  'ogTitle', 'ogDescription', 'address', 'mapUrl', 'youtubeUrl', 'footerText',
];

function buildUpdatePayload(body) {
  const data = {};
  for (const field of WRITABLE_SCALAR_FIELDS) {
    if (body[field] !== undefined) {
      const val = body[field];
      data[field] = val === '' || val === null ? null : val;
    }
  }
  if (body.themeConfig !== undefined) {
    data.themeConfig = mergeTheme(body.themeConfig);
  }
  if (body.homepageConfig !== undefined) {
    data.homepageConfig = mergeHomepage(body.homepageConfig);
  }
  if (body.footerLinks !== undefined) {
    data.footerLinks = body.footerLinks;
  }
  return data;
}

async function updateConfig(body) {
  const data = buildUpdatePayload(body);
  if (Object.keys(data).length === 0) {
    return getAdminConfig();
  }

  await prisma.systemSetting.upsert({
    where: { id: GLOBAL_ID },
    update: data,
    create: { id: GLOBAL_ID, ...data },
  });

  invalidateCache();
  return getAdminConfig();
}

/** Backward-compatible store-info update (existing admin clients) */
async function updateStoreInfoLegacy(body) {
  return updateConfig(body);
}

async function getStoreInfoLegacy() {
  return getMergedSettings();
}

module.exports = {
  invalidateCache,
  getMergedSettings,
  getPublicConfig,
  getAdminConfig,
  updateConfig,
  updateStoreInfoLegacy,
  getStoreInfoLegacy,
};
