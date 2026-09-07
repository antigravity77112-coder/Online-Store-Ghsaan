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

  // Fix the slate-500 replacement bug (bone0 -> slate-500)
  content = content.replace(/bone0/g, 'slate-500');

  // Fix slate-50 (now bone) if it was followed by opacity like bone/50 -> bone/50
  // Actually, 'bone' is fine. But let's check if there are other bugs.
  // Did it replace text-slate-50? Yes, text-bone. Which is fine.
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

console.log('Starting bone0 fix...');
walkDir('./src', processFile);
console.log('Finished bone0 fix.');
