import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = join(projectRoot, 'db.seed.json');
const dbPath = join(projectRoot, 'db.json');
const force = process.argv.includes('--force');

if (!existsSync(seedPath)) {
  console.error(`Seed file not found: ${seedPath}`);
  process.exit(1);
}

if (force || !existsSync(dbPath)) {
  copyFileSync(seedPath, dbPath);
  console.log(`${force ? 'Reset' : 'Created'} db.json from db.seed.json`);
} else {
  console.log('db.json already exists');
}
