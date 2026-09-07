import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.match(/\.(jsx|js|tsx|ts|html|css)$/)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace amber with agate
  content = content.replace(/amber-(\d+)/g, 'agate-$1');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated amber to agate: ${filePath}`);
  }
}

console.log('Starting amber replacement...');
walkDir('./src', processFile);
console.log('Finished amber replacement.');
