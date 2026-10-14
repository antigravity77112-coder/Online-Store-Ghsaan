const path = require('path');
const fsp = require('fs').promises;

function getBackupRoot() {
  const fromEnv = process.env.MIGRATION_BACKUP_DIR;
  if (fromEnv) return path.resolve(fromEnv);
  // Default: sibling folder outside the git repo
  return path.resolve(__dirname, '../../../../../../SmartShoper backup');
}

function getManifestDir(root = getBackupRoot()) {
  return path.join(root, 'manifests');
}

function getStateDir(root = getBackupRoot()) {
  return path.join(root, 'state');
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

async function ensureBackupLayout(root = getBackupRoot()) {
  await ensureDir(root);
  await ensureDir(path.join(root, 'files'));
  await ensureDir(getManifestDir(root));
  await ensureDir(getStateDir(root));
  return root;
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fsp.rename(tmp, filePath);
}

function toCsv(rows, columns) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c])).join(','));
  return [header, ...lines].join('\n');
}

module.exports = {
  getBackupRoot,
  getManifestDir,
  getStateDir,
  ensureDir,
  ensureBackupLayout,
  readJson,
  writeJson,
  toCsv,
};
