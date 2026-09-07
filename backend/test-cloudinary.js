require('dotenv').config();
const { uploadBuffer } = require('./src/utils/cloudinaryClient');

async function test() {
  try {
    const fs = require('fs');
    // create a simple dummy image buffer
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    
    console.log('Testing upload to Cloudinary...');
    const url = await uploadBuffer(buffer, 'test');
    console.log('Success! URL:', url);
  } catch (error) {
    console.error('Upload failed:');
    console.error(error);
  }
}

test();
