export type DocumentWorkspacePreset = {
  classValue?: string;
  subject?: string;
  lesson?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  questionCount?: number;
  additionalInstructions?: string;
};

export function readDocumentWorkspacePreset(
  route?: { params?: Record<string, unknown> },
): DocumentWorkspacePreset | undefined {
  const preset = route?.params?.workspacePreset;
  if (!preset || typeof preset !== 'object') return undefined;
  return preset as DocumentWorkspacePreset;
}

export function withDocumentWorkspaceParams(
  route?: { params?: Record<string, unknown> },
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const preset = readDocumentWorkspacePreset(route);
  if (!preset) return extra;
  return { ...extra, workspacePreset: preset };
}

export function workspacePresetToPreviewFields(preset?: DocumentWorkspacePreset) {
  if (!preset) return {};
  return {
    presetClass: preset.classValue,
    presetSubject: preset.subject,
    presetLesson: preset.lesson,
    presetDifficulty: preset.difficulty,
    presetQuestionCount: preset.questionCount,
    presetInstructions: preset.additionalInstructions,
  };
}
