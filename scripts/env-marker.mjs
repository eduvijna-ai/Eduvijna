#!/usr/bin/env node
/** Harmless child for wrapper tests — writes selected env vars as JSON (stdout or optional file path). */
import { writeFileSync } from 'node:fs';

const payload = JSON.stringify({
  EDUVIJNA_API_ENV: process.env.EDUVIJNA_API_ENV ?? null,
  EDUVIJNA_REQUIRE_PRODUCTION: process.env.EDUVIJNA_REQUIRE_PRODUCTION ?? null,
});

const outPath = process.argv[2];
if (outPath) {
  writeFileSync(outPath, payload, 'utf8');
} else {
  console.log(payload);
}
