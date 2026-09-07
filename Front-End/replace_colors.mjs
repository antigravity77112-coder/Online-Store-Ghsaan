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

  // Replace indigo with agate
  content = content.replace(/indigo-(\d+)/g, 'agate-$1');
  
  // Replace teeb with agate
  content = content.replace(/teeb-(\d+)/g, 'agate-$1');

  // Replace slate-50 with bone (mostly backgrounds)
  content = content.replace(/slate-50/g, 'bone');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

console.log('Starting color replacement...');
walkDir('./src', processFile);
console.log('Finished color replacement.');
