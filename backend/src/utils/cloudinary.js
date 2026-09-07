const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload an image buffer to Cloudinary
 * @param {Buffer} buffer - The image buffer from multer memory storage
 * @param {string} folder - The destination folder in Cloudinary
 * @returns {Promise<Object>} The Cloudinary upload result containing secure_url
 */
const uploadFromBuffer = (buffer, folder = 'yemeni_store') => {
  return new Promise((resolve, reject) => {
    const cld_upload_stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(cld_upload_stream);
  });
};

module.exports = { cloudinary, uploadFromBuffer };
