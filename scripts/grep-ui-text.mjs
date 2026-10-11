import { readFileSync } from 'node:fs';
import { parseUiTexts } from './lib/android-ui-parse.mjs';

const xml = process.argv[2];
const needle = (process.argv[3] || '').toLowerCase();
const texts = parseUiTexts(xml);
console.log(JSON.stringify(texts.filter((t) => t.toLowerCase().includes(needle)), null, 2));
