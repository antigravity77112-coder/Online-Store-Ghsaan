const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function writeChecksumLine(checksumsPath, relativePath, hash) {
  await fsp.appendFile(checksumsPath, `${hash}  ${relativePath}\n`, 'utf8');
}

module.exports = {
  sha256Buffer,
  sha256File,
  writeChecksumLine,
};
