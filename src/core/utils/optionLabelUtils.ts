export type McqOptionRenderMode = 'prefixed' | 'inline';

const getLabelFromIndex = (optionIndex: number): string => String.fromCharCode(65 + optionIndex);

const getLeadingLabelRegex = (label: string): RegExp =>
  new RegExp(`^\\s*${label}\\s*[.):-]\\s*`, 'i');

const stripLeadingLabels = (
  optionText: string,
  label: string,
): { stripped: string; count: number } => {
  const regex = getLeadingLabelRegex(label);
  let stripped = optionText;
  let count = 0;

  while (regex.test(stripped)) {
    stripped = stripped.replace(regex, '');
    count += 1;
  }

  return { stripped: stripped.trimStart(), count };
};

export const normalizeMcqOptionText = (
  optionText: string,
  optionIndex: number,
  mode: McqOptionRenderMode,
): string => {
  if (!optionText) return '';

  const label = getLabelFromIndex(optionIndex);
  const { stripped, count } = stripLeadingLabels(optionText, label);

  if (mode === 'prefixed') {
    return count > 0 ? stripped : optionText;
  }

  if (count >= 2) {
    return `${label}. ${stripped}`.trim();
  }

  return optionText;
};
