import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cfg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '.dev-api-credentials.local.json'), 'utf8'),
);
const p = cfg.accounts.instructor.password;
console.log(
  JSON.stringify({
    len: p.length,
    shape: [...p].map((c) => (/[a-zA-Z0-9]/.test(c) ? 'A' : 'S')).join(''),
  }),
);
