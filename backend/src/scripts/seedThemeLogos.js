#!/usr/bin/env node
/**
 * Upload GISAAH web + mobile logos to Cloudinary and persist separate URLs on SystemSetting.
 * Run: node src/scripts/seedThemeLogos.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const path = require('path');
const fs = require('fs');
const { uploadFile } = require('../utils/cloudinaryClient');
const siteConfigService = require('../services/siteConfigService');
const prisma = require('../prismaClient');

async function main() {
  const publicDir = path.resolve(__dirname, '../../../Front-End/public');
  const lightPath = path.join(publicDir, 'Logo_light_192.png');
  const darkPath = path.join(publicDir, 'Logo_dark_192.png');

  for (const file of [lightPath, darkPath]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing logo file: ${file}`);
    }
  }

  console.log('Uploading web + mobile logos to Cloudinary…');
  const [webLight, webDark, mobileLight, mobileDark] = await Promise.all([
    uploadFile(lightPath, { publicId: 'gisaah-web-logo-light' }),
    uploadFile(darkPath, { publicId: 'gisaah-web-logo-dark' }),
    uploadFile(lightPath, { publicId: 'gisaah-mobile-logo-light' }),
    uploadFile(darkPath, { publicId: 'gisaah-mobile-logo-dark' }),
  ]);

  await siteConfigService.updateConfig({
    logoUrl: webLight.secure_url,
    logoDarkUrl: webDark.secure_url,
    logoMobileUrl: mobileLight.secure_url,
    logoMobileDarkUrl: mobileDark.secure_url,
  });

  console.log('SystemSetting updated (web + mobile separated):');
  console.log('  logoUrl (web light):', webLight.secure_url);
  console.log('  logoDarkUrl (web dark):', webDark.secure_url);
  console.log('  logoMobileUrl (app light):', mobileLight.secure_url);
  console.log('  logoMobileDarkUrl (app dark):', mobileDark.secure_url);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
