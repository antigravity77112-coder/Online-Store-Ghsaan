const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();

async function uploadBuffer(buffer, folder = 'products') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', format: 'jpg', quality: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

async function fixBrokenImage(id, url) {
  try {
    console.log('Downloading from cache:', url);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    console.log('Downloaded bytes:', buffer.length);
    
    console.log('Uploading to Cloudinary...');
    const newUrl = await uploadBuffer(buffer, 'products');
    console.log('New URL:', newUrl);
    
    await prisma.productImage.update({
      where: { id },
      data: { url: newUrl }
    });
    console.log('Database updated successfully!');
  } catch (err) {
    console.error('Error fixing image', url, err.message);
  }
}

async function main() {
  const diva = await prisma.product.findFirst({
    where: { title: { contains: 'ديفا' } },
    include: { images: true }
  });
  
  if (diva) {
    for (const img of diva.images) {
      await fixBrokenImage(img.id, img.url);
    }
  } else {
    console.log("No product found");
  }
  await prisma.$disconnect();
}

main().catch(console.error);
