/**
 * Stable option indices for grading — avoids case-folded text collisions (e.g. x vs X).
 */

import { stripOptionLabel } from './answerMappingUtils';

export type OptionPermutation = number[];

export function letterToOptionIndex(letter: string, optionCount: number): number | null {
  const ch = letter.trim().toUpperCase();
  if (!/^[A-D]$/.test(ch)) return null;
  const idx = ch.charCodeAt(0) - 65;
  if (idx < 0 || idx >= optionCount) return null;
  return idx;
}

/**
 * Resolve API correct answer to a unique option index, or null if ambiguous / invalid.
 */
export function resolveCorrectOptionIndex(rawCorrect: string, options: string[]): number | null {
  const trimmed = rawCorrect.trim();
  if (!trimmed) return null;

  if (trimmed.length === 1) {
    const letterIdx = letterToOptionIndex(trimmed, options.length);
    if (letterIdx != null) return letterIdx;
  }

  const exactMatches: number[] = [];
  options.forEach((o, i) => {
    if (o === trimmed) exactMatches.push(i);
  });
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) return null;

  const strippedTarget = stripOptionLabel(trimmed);
  const exactStripped = options.findIndex((o) => stripOptionLabel(o) === strippedTarget);
  if (exactStripped !== -1) return exactStripped;

  const looseMatches: number[] = [];
  options.forEach((o, i) => {
    if (o === strippedTarget) looseMatches.push(i);
  });
  if (looseMatches.length === 1) return looseMatches[0];

  return null;
}

export function resolveSelectedOptionIndex(selectedAnswer: string, options: string[]): number | null {
  return resolveCorrectOptionIndex(selectedAnswer, options);
}

export function permuteOptions(options: string[], order: OptionPermutation): string[] {
  return order.map((i) => options[i]);
}

export function invertPermutation(order: OptionPermutation): OptionPermutation {
  const inv: number[] = [];
  order.forEach((originalIndex, displayIndex) => {
    inv[originalIndex] = displayIndex;
  });
  return inv;
}

export function shuffleOptionOrder(
  optionCount: number,
  correctIndex: number,
  random: () => number = Math.random,
): OptionPermutation {
  const order = Array.from({ length: optionCount }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (!order.includes(correctIndex)) {
    throw new Error('CORRECT_OPTION_NOT_FOUND_AFTER_SHUFFLE');
  }
  return order;
}
