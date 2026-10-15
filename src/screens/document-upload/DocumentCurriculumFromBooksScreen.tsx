/**
 * Document Assessment → From Books (Quiz-React HandwrittenWorkspace file mode).
 * Alignment OFF/ON both POST /api/v1/content/saved-books/generate.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { useUserStore } from '@core/store/user.store';
import {
  buildHierarchicalUnitOptions,
  deriveCurrentVersionOptions,
  deriveVersionOptions,
  findCatalogContext,
  getCurriculumCatalog,
  resolveCurriculumByCodes,
  type CurriculumCatalogContext,
  type CurriculumResolveUnit,
} from '@core/services/curriculumAssessment.service';
import {
  bindSavedBooksSelectionToCatalog,
  EMPTY_CURRICULUM_TOPIC_REFINEMENTS_MESSAGE,
  findUniqueUnitCodeForSavedBookTopic,
  formatSchoolGradeDocumentLabel,
  normalizeGradeToken,
} from '@core/services/savedBooksCurriculumSemantic';
import {
  buildCurriculumSavedBooksGenerateParams,
  buildSavedBooksGenerateParams,
  cancelGenerationJob,
  fileFormValidationErrors,
  generateFromSavedBooks,
  getAssessmentGenerationStageLabel,
  getFileModePrefs,
  getSavedBooksBoards,
  getSavedBooksClasses,
  getSavedBooksCurriculumRefinements,
  getSavedBooksSubtopics,
  getSavedBooksSubjects,
  getSavedBooksTopics,
  MISSING_ALIGNMENT_METADATA_MESSAGE,
  saveFileModePrefs,
  summarizeVerifiedDelivery,
  type SavedBooksDropdownItem,
} from '@core/services/savedBooksContent.service';
import {
  CURRICULUM_VERIFICATION_FAILED_CODE,
  createCurriculumGenerationError,
  getApiErrorMessage,
  getCurriculumGenerationErrorMessage,
} from '@core/services/curriculumGenerationErrors';
import {
  buildCurriculumGeneratedPreviewParams,
  type CurriculumSource,
} from '@core/utils/documentCurriculumGeneratedHandoff';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te', label: 'Telugu' },
  { value: 'ta', label: 'Tamil' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'pa', label: 'Punjabi' },
];

const COUNT_OPTIONS = [5, 10, 15, 20];
const LEVELS = ['easy', 'medium', 'hard', 'mixed'] as const;

function classDisplayLabel(label: string): string {
  const gradeCode = normalizeGradeToken(label);
  return gradeCode ? formatSchoolGradeDocumentLabel(gradeCode, label) : label;
}

export default function DocumentCurriculumFromBooksScreen({
  navigation,
  embedded,
}: {
  navigation: { navigate: (name: string, params?: object) => void; goBack?: () => void };
  embedded?: boolean;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const schoolId = useUserStore((s) => s.schoolId) ?? undefined;
  const accountId = useUserStore((s) => s.user?.id) ?? null;
  const resolvedSchoolId = schoolId != null ? Number(schoolId) : undefined;

  const prefs = useMemo(
    () => getFileModePrefs(accountId, resolvedSchoolId ?? null),
    // Initial snapshot only — subsequent writes persist via effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [curriculumAlignmentEnabled, setCurriculumAlignmentEnabled] = useState(false);
  const [boards, setBoards] = useState<SavedBooksDropdownItem[]>([]);
  const [classes, setClasses] = useState<SavedBooksDropdownItem[]>([]);
  const [subjects, setSubjects] = useState<SavedBooksDropdownItem[]>([]);
  const [topics, setTopics] = useState<SavedBooksDropdownItem[]>([]);
  const [subtopics, setSubtopics] = useState<SavedBooksDropdownItem[]>([]);
  const [selBoard, setSelBoard] = useState<SavedBooksDropdownItem | null>(null);
  const [selClass, setSelClass] = useState<SavedBooksDropdownItem | null>(null);
  const [selSubject, setSelSubject] = useState<SavedBooksDropdownItem | null>(null);
  const [selTopics, setSelTopics] = useState<string[]>([]);
  const [selSubtopics, setSelSubtopics] = useState<string[]>([]);
  const [instructions, setInstructions] = useState(prefs.instructions || 'summary');
  const [difficulty, setDifficulty] = useState<(typeof LEVELS)[number]>(prefs.difficulty);
  const [language, setLanguage] = useState(prefs.language || 'en');
  const [questionCount, setQuestionCount] = useState(prefs.questionCount || 5);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stageLabel, setStageLabel] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [customSubtopic, setCustomSubtopic] = useState('');
  const [topicsInfo, setTopicsInfo] = useState<string | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const [catalogContexts, setCatalogContexts] = useState<CurriculumCatalogContext[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [units, setUnits] = useState<CurriculumResolveUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [selectedBoardCode, setSelectedBoardCode] = useState('');
  const [selectedGradeCode, setSelectedGradeCode] = useState('');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('');
  const [selectedVersionLabel, setSelectedVersionLabel] = useState('');
  const [selectedUnitCode, setSelectedUnitCode] = useState('');
  const [underfillWarning, setUnderfillWarning] = useState<string | null>(null);

  const restoredRef = useRef(false);
  const curriculumIdentityRef = useRef<string | null>(null);
  const generateInFlightRef = useRef(false);
  const genSeqRef = useRef(0);
  const genAbortRef = useRef<AbortController | null>(null);
  const genJobIdRef = useRef<string | null>(null);

  const abortGeneration = useCallback(
    (opts?: { cancelJob?: boolean }) => {
      genSeqRef.current += 1;
      genAbortRef.current?.abort();
      genAbortRef.current = null;
      const jobId = genJobIdRef.current;
      genJobIdRef.current = null;
      setStageLabel(null);
      if (opts?.cancelJob !== false && jobId) {
        void cancelGenerationJob(jobId, resolvedSchoolId ?? null);
      }
    },
    [resolvedSchoolId],
  );

  useEffect(() => () => abortGeneration(), [abortGeneration]);

  const selectedCatalogContext = useMemo(() => {
    if (!selectedBoardCode || !selectedGradeCode || !selectedSubjectCode || !selectedVersionLabel) {
      return null;
    }
    return (
      findCatalogContext(
        catalogContexts,
        selectedBoardCode,
        selectedGradeCode,
        selectedSubjectCode,
        selectedVersionLabel,
      ) || null
    );
  }, [
    catalogContexts,
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
    selectedVersionLabel,
  ]);

  const selectedUnit = useMemo(
    () => units.find((u) => u.unit_code === selectedUnitCode) || null,
    [units, selectedUnitCode],
  );
  const hierarchicalUnits = useMemo(() => buildHierarchicalUnitOptions(units), [units]);
  const versionOptions = useMemo(() => {
    if (!selectedBoardCode || !selectedGradeCode || !selectedSubjectCode) return [];
    return deriveVersionOptions(
      catalogContexts,
      selectedBoardCode,
      selectedGradeCode,
      selectedSubjectCode,
    );
  }, [catalogContexts, selectedBoardCode, selectedGradeCode, selectedSubjectCode]);

  const offErrors = useMemo(
    () =>
      fileFormValidationErrors({
        board: selBoard,
        classItem: selClass,
        subject: selSubject,
        topics: selTopics,
        difficulty,
        instructions,
      }),
    [selBoard, selClass, selSubject, selTopics, difficulty, instructions],
  );
  const isFileFormReady = offErrors.length === 0;
  const curriculumSelectorsComplete = Boolean(selectedCatalogContext && selectedUnitCode && selectedUnit);
  const isFileCurriculumAssessmentReady =
    !catalogLoading && !catalogError && curriculumSelectorsComplete && Boolean(selectedUnit) && !isGenerating;
  const isFileAssessmentReady = curriculumAlignmentEnabled
    ? isFileCurriculumAssessmentReady
    : isFileFormReady;

  const topicGate = useMemo(() => {
    if (!curriculumAlignmentEnabled) {
      return { disabled: !selSubject, placeholder: selSubject ? 'Select topics' : 'Select Subject first' };
    }
    if (!selectedVersionLabel) {
      return { disabled: true, placeholder: 'Select curriculum version first' };
    }
    if (!selectedUnitCode) {
      return { disabled: true, placeholder: 'Select Unit / Chapter first' };
    }
    return { disabled: false, placeholder: 'Select topics (optional refinement)' };
  }, [curriculumAlignmentEnabled, selSubject, selectedVersionLabel, selectedUnitCode]);

  const subtopicGate = useMemo(() => {
    if (!curriculumAlignmentEnabled) {
      return {
        disabled: !selSubject,
        placeholder: selSubject ? 'Select sub topics (optional)' : 'Select Subject first',
      };
    }
    if (!selectedVersionLabel) {
      return { disabled: true, placeholder: 'Select curriculum version first' };
    }
    if (!selectedUnitCode) {
      return { disabled: true, placeholder: 'Select Unit / Chapter first' };
    }
    if (selTopics.length === 0) {
      return { disabled: true, placeholder: 'Select topics (optional) first' };
    }
    return { disabled: false, placeholder: 'Select sub topics (optional)' };
  }, [
    curriculumAlignmentEnabled,
    selSubject,
    selectedVersionLabel,
    selectedUnitCode,
    selTopics.length,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoadingBoards(true);
    getSavedBooksBoards(resolvedSchoolId, accountId)
      .then((items) => {
        if (!cancelled) setBoards(items);
      })
      .catch(() => {
        if (!cancelled) setBoards([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBoards(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedSchoolId, accountId]);

  useEffect(() => {
    if (!selBoard?.id) {
      setClasses([]);
      setSelClass(null);
      return;
    }
    let cancelled = false;
    getSavedBooksClasses(selBoard.id, resolvedSchoolId, accountId)
      .then((items) => {
        if (!cancelled) setClasses(items);
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selBoard?.id, resolvedSchoolId, accountId]);

  useEffect(() => {
    if (!selBoard?.id || !selClass?.id) {
      setSubjects([]);
      setSelSubject(null);
      return;
    }
    let cancelled = false;
    getSavedBooksSubjects(selBoard.id, selClass.id, resolvedSchoolId, accountId)
      .then((items) => {
        if (!cancelled) setSubjects(items);
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selBoard?.id, selClass?.id, resolvedSchoolId, accountId]);

  useEffect(() => {
    if (curriculumAlignmentEnabled) return;
    if (!selBoard?.id || !selClass?.id || !selSubject?.id) {
      setTopics([]);
      setSelTopics([]);
      setTopicsInfo(null);
      return;
    }
    let cancelled = false;
    setTopicsInfo(null);
    getSavedBooksTopics(selBoard.id, selClass.id, selSubject.id, resolvedSchoolId, accountId)
      .then((items) => {
        if (!cancelled) setTopics(items);
      })
      .catch(() => {
        if (!cancelled) setTopics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    curriculumAlignmentEnabled,
    selBoard?.id,
    selClass?.id,
    selSubject?.id,
    resolvedSchoolId,
    accountId,
  ]);

  useEffect(() => {
    if (curriculumAlignmentEnabled) return;
    if (!selBoard?.id || !selClass?.id || !selSubject?.id) {
      setSubtopics([]);
      setSelSubtopics([]);
      return;
    }
    let cancelled = false;
    getSavedBooksSubtopics(
      selBoard.id,
      selClass.id,
      selSubject.id,
      selTopics,
      resolvedSchoolId,
      accountId,
    )
      .then((items) => {
        if (!cancelled) setSubtopics(items);
      })
      .catch(() => {
        if (!cancelled) setSubtopics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    curriculumAlignmentEnabled,
    selBoard?.id,
    selClass?.id,
    selSubject?.id,
    selTopics,
    resolvedSchoolId,
    accountId,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) {
      setCatalogContexts([]);
      setCatalogError(null);
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    getCurriculumCatalog({ currentOnly: true })
      .then((res) => {
        if (!cancelled) setCatalogContexts(res.contexts || []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCatalogContexts([]);
        setCatalogError(err instanceof Error ? err.message : 'Failed to load curriculum catalog.');
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [curriculumAlignmentEnabled]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled || catalogLoading) return;
    if (!selBoard?.label || !selClass?.label || !selSubject?.label) return;
    const bound = bindSavedBooksSelectionToCatalog(
      selBoard.label,
      selClass.label,
      selSubject.label,
      catalogContexts,
    );
    if (!bound) return;
    if (selectedBoardCode !== bound.boardCode) setSelectedBoardCode(bound.boardCode);
    if (selectedGradeCode !== bound.gradeCode) setSelectedGradeCode(bound.gradeCode);
    if (selectedSubjectCode !== bound.subjectCode) setSelectedSubjectCode(bound.subjectCode);
  }, [
    curriculumAlignmentEnabled,
    catalogLoading,
    catalogContexts,
    selBoard?.label,
    selClass?.label,
    selSubject?.label,
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) return;
    if (!selectedBoardCode || !selectedGradeCode || !selectedSubjectCode) return;
    const currentVersions = deriveCurrentVersionOptions(
      catalogContexts,
      selectedBoardCode,
      selectedGradeCode,
      selectedSubjectCode,
    );
    if (currentVersions.length !== 1) return;
    const onlyVersion = currentVersions[0];
    if (selectedVersionLabel === onlyVersion) return;
    if (selectedVersionLabel && currentVersions.includes(selectedVersionLabel)) return;
    setSelectedVersionLabel(onlyVersion);
  }, [
    curriculumAlignmentEnabled,
    catalogContexts,
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
    selectedVersionLabel,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) return;
    if (!selectedBoardCode || !selectedGradeCode || !selectedSubjectCode || !selectedVersionLabel) {
      setUnits([]);
      setUnitsError(null);
      return;
    }
    let cancelled = false;
    setUnitsLoading(true);
    setUnitsError(null);
    resolveCurriculumByCodes({
      board_code: selectedBoardCode,
      grade_code: selectedGradeCode,
      subject_code: selectedSubjectCode,
      version_label: selectedVersionLabel,
    })
      .then((res) => {
        if (!cancelled) setUnits(res.units || []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUnits([]);
        setUnitsError(err instanceof Error ? err.message : 'Failed to resolve curriculum units.');
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    curriculumAlignmentEnabled,
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
    selectedVersionLabel,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) return;
    if (selectedUnitCode || unitsLoading || !selectedVersionLabel || !units.length) return;
    if (selTopics.length !== 1) return;
    const unitCode = findUniqueUnitCodeForSavedBookTopic(units, selTopics[0]);
    if (unitCode) setSelectedUnitCode(unitCode);
  }, [
    curriculumAlignmentEnabled,
    selectedUnitCode,
    selectedVersionLabel,
    units,
    unitsLoading,
    selTopics,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) {
      curriculumIdentityRef.current = null;
      return;
    }
    if (
      !selectedBoardCode ||
      !selectedGradeCode ||
      !selectedSubjectCode ||
      !selectedVersionLabel ||
      !selectedUnitCode
    ) {
      curriculumIdentityRef.current = null;
      return;
    }
    const identityKey = [
      selectedBoardCode,
      selectedGradeCode,
      selectedSubjectCode,
      selectedVersionLabel,
      selectedUnitCode,
    ].join('\0');
    if (curriculumIdentityRef.current !== null && curriculumIdentityRef.current !== identityKey) {
      setSelTopics([]);
      setSelSubtopics([]);
    }
    curriculumIdentityRef.current = identityKey;
  }, [
    curriculumAlignmentEnabled,
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
    selectedVersionLabel,
    selectedUnitCode,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) return;
    if (
      !selectedBoardCode ||
      !selectedGradeCode ||
      !selectedSubjectCode ||
      !selectedVersionLabel ||
      !selectedUnitCode
    ) {
      setTopics([]);
      setSelTopics([]);
      setTopicsInfo(null);
      setTopicsLoading(false);
      return;
    }
    let cancelled = false;
    setTopicsLoading(true);
    getSavedBooksCurriculumRefinements({
      board_code: selectedBoardCode,
      grade_code: selectedGradeCode,
      subject_code: selectedSubjectCode,
      version_label: selectedVersionLabel,
      unit_code: selectedUnitCode,
      school_id: resolvedSchoolId,
    })
      .then((res) => {
        if (cancelled) return;
        const items = res.topics || [];
        setTopics(items);
        setTopicsInfo(items.length === 0 ? EMPTY_CURRICULUM_TOPIC_REFINEMENTS_MESSAGE : null);
      })
      .catch(() => {
        if (cancelled) return;
        setTopics([]);
        setTopicsInfo(EMPTY_CURRICULUM_TOPIC_REFINEMENTS_MESSAGE);
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    curriculumAlignmentEnabled,
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
    selectedVersionLabel,
    selectedUnitCode,
    resolvedSchoolId,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) return;
    if (
      !selectedBoardCode ||
      !selectedGradeCode ||
      !selectedSubjectCode ||
      !selectedVersionLabel ||
      !selectedUnitCode ||
      selTopics.length === 0
    ) {
      setSubtopics([]);
      setSelSubtopics([]);
      return;
    }
    let cancelled = false;
    getSavedBooksCurriculumRefinements({
      board_code: selectedBoardCode,
      grade_code: selectedGradeCode,
      subject_code: selectedSubjectCode,
      version_label: selectedVersionLabel,
      unit_code: selectedUnitCode,
      school_id: resolvedSchoolId,
      topics: selTopics,
    })
      .then((res) => {
        if (!cancelled) setSubtopics(res.subtopics || []);
      })
      .catch(() => {
        if (!cancelled) setSubtopics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    curriculumAlignmentEnabled,
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
    selectedVersionLabel,
    selectedUnitCode,
    selTopics,
    resolvedSchoolId,
  ]);

  useEffect(() => {
    if (restoredRef.current || !boards.length) return;
    if (prefs.boardId) {
      const board = boards.find((item) => item.id === prefs.boardId);
      if (board) setSelBoard(board);
    }
  }, [boards, prefs.boardId]);

  useEffect(() => {
    if (!selBoard?.id || !classes.length || selClass) return;
    if (prefs.classId) {
      const cls = classes.find((item) => item.id === prefs.classId);
      if (cls) setSelClass(cls);
    }
  }, [selBoard?.id, classes, selClass, prefs.classId]);

  useEffect(() => {
    if (!selClass?.id || !subjects.length || selSubject) return;
    if (prefs.subjectId) {
      const subject = subjects.find((item) => item.id === prefs.subjectId);
      if (subject) setSelSubject(subject);
    }
  }, [selClass?.id, subjects, selSubject, prefs.subjectId]);

  useEffect(() => {
    if (selTopics.length > 0) return;
    if (curriculumAlignmentEnabled) return;
    if (!selSubject?.id || !topics.length) return;
    if (!prefs.topics.length) {
      restoredRef.current = true;
      return;
    }
    const validTopics = prefs.topics.filter((topic) => topics.some((item) => item.label === topic));
    if (validTopics.length) setSelTopics(validTopics);
    restoredRef.current = true;
  }, [curriculumAlignmentEnabled, selSubject?.id, topics, selTopics.length, prefs.topics]);

  useEffect(() => {
    saveFileModePrefs(
      {
        boardId: selBoard?.id,
        boardLabel: selBoard?.label,
        classId: selClass?.id,
        classLabel: selClass?.label,
        subjectId: selSubject?.id,
        subjectLabel: selSubject?.label,
        curriculumBoardCode: curriculumAlignmentEnabled ? selectedBoardCode : undefined,
        curriculumGradeCode: curriculumAlignmentEnabled ? selectedGradeCode : undefined,
        curriculumSubjectCode: curriculumAlignmentEnabled ? selectedSubjectCode : undefined,
        curriculumVersionLabel: curriculumAlignmentEnabled ? selectedVersionLabel : undefined,
        curriculumUnitCode: curriculumAlignmentEnabled ? selectedUnitCode : undefined,
        topics: selTopics,
        subtopics: selSubtopics,
        difficulty,
        language,
        questionCount,
        instructions,
      },
      accountId,
      resolvedSchoolId ?? null,
    );
  }, [
    accountId,
    resolvedSchoolId,
    curriculumAlignmentEnabled,
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
    selectedVersionLabel,
    selectedUnitCode,
    selBoard,
    selClass,
    selSubject,
    selTopics,
    selSubtopics,
    difficulty,
    language,
    questionCount,
    instructions,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) return;
    abortGeneration();
    setUnderfillWarning(null);
  }, [
    selectedBoardCode,
    selectedGradeCode,
    selectedSubjectCode,
    selectedVersionLabel,
    selectedUnitCode,
    abortGeneration,
    curriculumAlignmentEnabled,
  ]);

  useEffect(() => {
    if (!curriculumAlignmentEnabled) return;
    abortGeneration();
    setUnderfillWarning(null);
  }, [selTopics.join('\0'), selSubtopics.join('\0'), abortGeneration, curriculumAlignmentEnabled]);

  useEffect(() => {
    abortGeneration();
  }, [selBoard?.id, selClass?.id, selSubject?.id, abortGeneration]);

  const onGenerate = async () => {
    if (generateInFlightRef.current || isGenerating) return;

    if (curriculumAlignmentEnabled) {
      if (!isFileCurriculumAssessmentReady || !selectedCatalogContext || !selectedUnit) {
        setGenerateError('Select Board, Class, Subject, Curriculum Version, and Unit before generating.');
        return;
      }
      const topicsSnapshot = [...selTopics];
      const subtopicsSnapshot = [...selSubtopics];
      generateInFlightRef.current = true;
      setIsGenerating(true);
      setGenerateError(null);
      setUnderfillWarning(null);
      const genSeq = ++genSeqRef.current;
      const controller = new AbortController();
      genAbortRef.current?.abort();
      genAbortRef.current = controller;
      genJobIdRef.current = null;
      setStageLabel(getAssessmentGenerationStageLabel('queued'));

      try {
        const res = await generateFromSavedBooks(
          buildCurriculumSavedBooksGenerateParams({
            topics: topicsSnapshot,
            subtopics: subtopicsSnapshot,
            language,
            difficulty,
            numQuestions: questionCount,
            additionalInstructions: instructions,
            schoolId: resolvedSchoolId,
            curriculumContext: {
              board_code: selectedBoardCode,
              grade_code: selectedGradeCode,
              subject_code: selectedSubjectCode,
              version_label: selectedVersionLabel || undefined,
              unit_code: selectedUnitCode,
            },
          }),
          {
            signal: controller.signal,
            onJobAccepted: (jobId) => {
              genJobIdRef.current = jobId;
            },
            onStage: (stage, status) => {
              setStageLabel(getAssessmentGenerationStageLabel(stage, status));
            },
          },
        );
        if (genSeq !== genSeqRef.current || controller.signal.aborted) return;
        if (!res.assessment_intelligence) {
          throw new Error(MISSING_ALIGNMENT_METADATA_MESSAGE);
        }
        const delivery = summarizeVerifiedDelivery(res, {
          returnedCountFallback: res.quiz?.length ?? 0,
        });
        if (!res.quiz?.length) {
          if (delivery.hasDeliveryMetadata) {
            throw createCurriculumGenerationError(CURRICULUM_VERIFICATION_FAILED_CODE);
          }
          throw new Error(res.message || 'No questions returned');
        }
        const underfill = (res.assessment_intelligence.warnings || []).find(
          (w) => w.code === 'curriculum_generation_underfilled',
        );
        setUnderfillWarning(underfill?.message || null);
        const source: CurriculumSource = 'Doc-File-Curriculum';
        const previewParams = buildCurriculumGeneratedPreviewParams({
          generationResponse: res,
          sessionId: null,
          source,
          curriculumMeta: {
            alignmentEnabled: true,
            boardCode: selectedBoardCode,
            gradeCode: selectedGradeCode,
            subjectCode: selectedSubjectCode,
            versionLabel: selectedVersionLabel,
            unitCodes: [selectedUnitCode],
            topicTitles: selectedUnit.title,
            subtopics: subtopicsSnapshot,
            language,
            additionalInstructions: instructions.trim(),
            level: difficulty,
            count: questionCount,
            title:
              [selectedCatalogContext.subject.label, selectedUnit.title].filter(Boolean).join(' - ') ||
              'Curriculum Assessment',
            classLabel: selectedCatalogContext.grade.label,
            subjectLabel: selectedCatalogContext.subject.label,
          },
        });
        navigation.navigate('DocumentCurriculumGeneratedPreviewScreen', previewParams);
      } catch (err: unknown) {
        if (
          controller.signal.aborted ||
          genSeq !== genSeqRef.current ||
          (err != null && typeof err === 'object' && (err as { name?: string }).name === 'AbortError')
        ) {
          return;
        }
        setGenerateError(
          getCurriculumGenerationErrorMessage(
            err,
            getApiErrorMessage(err, 'Curriculum-aligned assessment generation failed.'),
          ),
        );
      } finally {
        if (genAbortRef.current === controller) genAbortRef.current = null;
        if (genJobIdRef.current) genJobIdRef.current = null;
        setStageLabel(null);
        generateInFlightRef.current = false;
        setIsGenerating(false);
      }
      return;
    }

    if (!isFileFormReady) {
      setGenerateError(offErrors.join('. '));
      return;
    }
    generateInFlightRef.current = true;
    setIsGenerating(true);
    setGenerateError(null);
    const genSeq = ++genSeqRef.current;
    const controller = new AbortController();
    genAbortRef.current?.abort();
    genAbortRef.current = controller;
    genJobIdRef.current = null;
    setStageLabel(getAssessmentGenerationStageLabel('queued'));
    try {
      const res = await generateFromSavedBooks(
        buildSavedBooksGenerateParams({
          board: selBoard!,
          classItem: selClass!,
          subject: selSubject!,
          topics: selTopics,
          subtopics: selSubtopics,
          language,
          difficulty,
          numQuestions: questionCount,
          additionalInstructions: instructions,
          schoolId: resolvedSchoolId,
        }),
        {
          signal: controller.signal,
          onJobAccepted: (jobId) => {
            genJobIdRef.current = jobId;
          },
          onStage: (stage, status) => {
            setStageLabel(getAssessmentGenerationStageLabel(stage, status));
          },
        },
      );
      if (genSeq !== genSeqRef.current || controller.signal.aborted) return;
      if (!res.quiz?.length) {
        throw new Error(res.message || 'No questions returned');
      }
      const previewParams = buildCurriculumGeneratedPreviewParams({
        generationResponse: res,
        sessionId: null,
        source: 'Doc-File-Assessment',
        curriculumMeta: {
          alignmentEnabled: false,
          boardCode: String(selBoard!.id),
          gradeCode: String(selClass!.id),
          subjectCode: String(selSubject!.id),
          versionLabel: '',
          unitCodes: [],
          topicTitles: selTopics.join(', '),
          subtopics: selSubtopics,
          language,
          additionalInstructions: instructions.trim(),
          level: difficulty,
          count: questionCount,
          title: [selSubject?.label, selTopics.join(', ')].filter(Boolean).join(' - ') || 'Document Assessment',
          classLabel: selClass?.label || '',
          subjectLabel: selSubject?.label || '',
        },
      });
      navigation.navigate('DocumentCurriculumGeneratedPreviewScreen', previewParams);
    } catch (err: unknown) {
      if (
        controller.signal.aborted ||
        genSeq !== genSeqRef.current ||
        (err != null && typeof err === 'object' && (err as { name?: string }).name === 'AbortError')
      ) {
        return;
      }
      setGenerateError(getApiErrorMessage(err, 'Assessment generation failed. Please try again.'));
    } finally {
      if (genAbortRef.current === controller) genAbortRef.current = null;
      if (genJobIdRef.current) genJobIdRef.current = null;
      setStageLabel(null);
      generateInFlightRef.current = false;
      setIsGenerating(false);
    }
  };

  const toggleLabel = (list: string[], label: string, setter: (next: string[]) => void) => {
    setter(list.includes(label) ? list.filter((item) => item !== label) : [...list, label]);
  };

  const addCustom = (value: string, list: string[], setter: (next: string[]) => void, clear: () => void) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) {
      clear();
      return;
    }
    setter([...list, trimmed]);
    clear();
  };

  return (
    <View style={[styles.root, !embedded && { paddingTop: insets.top }]}>
      {!embedded ? (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack?.()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>From Books</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DocumentUploadHistoryScreen')}>
            <Text style={styles.link}>History</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.embeddedToolbar}>
          <TouchableOpacity onPress={() => navigation.navigate('DocumentUploadHistoryScreen')}>
            <Text style={styles.link}>Document history</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.alignmentRow} testID="curriculum-alignment-row">
        <View style={{ flex: 1 }}>
          <Text style={styles.alignmentTitle}>Curriculum Alignment</Text>
          <Text style={styles.alignmentSub}>Optional curriculum-aware generation</Text>
        </View>
        <Switch
          testID="curriculum-alignment-switch"
          accessibilityLabel="Curriculum Alignment"
          value={curriculumAlignmentEnabled}
          onValueChange={(enabled) => {
            setCurriculumAlignmentEnabled(enabled);
            setGenerateError(null);
            setUnderfillWarning(null);
            if (!enabled) {
              setSelectedVersionLabel('');
              setSelectedUnitCode('');
              setUnits([]);
            }
          }}
        />
        <Text style={styles.alignmentState}>{curriculumAlignmentEnabled ? 'ON' : 'OFF'}</Text>
      </View>

      {loadingBoards ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} testID="from-books-form">
          <Text style={styles.groupTitle}>Academic Context</Text>

          <SelectBlock
            label="Board"
            testID="from-books-board"
            placeholder="Select Board"
            value={selBoard ? String(selBoard.id) : ''}
            options={boards.map((b) => ({ value: String(b.id), label: b.label }))}
            onChange={(value) => {
              const next = boards.find((b) => String(b.id) === value) || null;
              setSelBoard(next);
              setClasses([]);
              setSubjects([]);
              setTopics([]);
              setSubtopics([]);
              setSelClass(null);
              setSelSubject(null);
              setSelTopics([]);
              setSelSubtopics([]);
              if (curriculumAlignmentEnabled) {
                setSelectedBoardCode('');
                setSelectedGradeCode('');
                setSelectedSubjectCode('');
                setSelectedVersionLabel('');
                setSelectedUnitCode('');
                setUnits([]);
              }
            }}
            styles={styles}
            colors={colors}
          />

          <SelectBlock
            label="Class"
            testID="from-books-class"
            placeholder={selBoard ? 'Select Class' : 'Select Board first'}
            disabled={!selBoard}
            value={selClass ? String(selClass.id) : ''}
            options={classes.map((c) => ({
              value: String(c.id),
              label: classDisplayLabel(c.label),
            }))}
            onChange={(value) => {
              const next = classes.find((c) => String(c.id) === value) || null;
              setSelClass(next);
              setSubjects([]);
              setTopics([]);
              setSubtopics([]);
              setSelSubject(null);
              setSelTopics([]);
              setSelSubtopics([]);
              if (curriculumAlignmentEnabled) {
                setSelectedGradeCode('');
                setSelectedSubjectCode('');
                setSelectedVersionLabel('');
                setSelectedUnitCode('');
                setUnits([]);
              }
            }}
            styles={styles}
            colors={colors}
          />

          <SelectBlock
            label="Subject"
            testID="from-books-subject"
            placeholder={selClass ? 'Select Subject' : 'Select Class first'}
            disabled={!selClass}
            value={selSubject ? String(selSubject.id) : ''}
            options={subjects.map((s) => ({ value: String(s.id), label: s.label }))}
            onChange={(value) => {
              const next = subjects.find((s) => String(s.id) === value) || null;
              setSelSubject(next);
              setTopics([]);
              setSubtopics([]);
              setSelTopics([]);
              setSelSubtopics([]);
              if (curriculumAlignmentEnabled) {
                setSelectedSubjectCode('');
                setSelectedVersionLabel('');
                setSelectedUnitCode('');
                setUnits([]);
              }
            }}
            styles={styles}
            colors={colors}
          />

          {curriculumAlignmentEnabled ? (
            <>
              {catalogLoading ? (
                <Text style={styles.hint}>Loading curriculum catalog…</Text>
              ) : null}
              {catalogError ? <Text style={styles.warn}>{catalogError}</Text> : null}
              {!catalogLoading && !catalogError && catalogContexts.length === 0 ? (
                <Text style={styles.warn}>Curriculum alignment is not currently available for this selection.</Text>
              ) : null}

              <SelectBlock
                label="Curriculum Version"
                testID="from-books-version"
                placeholder="Select curriculum version"
                disabled={!selectedSubjectCode}
                value={selectedVersionLabel}
                options={versionOptions.map((v) => ({ value: v, label: v }))}
                onChange={(value) => {
                  setSelectedVersionLabel(value);
                  setSelectedUnitCode('');
                }}
                styles={styles}
                colors={colors}
              />

              <SelectBlock
                label="Unit / Chapter"
                testID="from-books-unit"
                placeholder={unitsLoading ? 'Loading units…' : 'Select Unit / Chapter'}
                disabled={!selectedVersionLabel || unitsLoading}
                value={selectedUnitCode}
                options={hierarchicalUnits.map((u) => ({ value: u.unit_code, label: u.label }))}
                onChange={setSelectedUnitCode}
                styles={styles}
                colors={colors}
              />
              {unitsError ? <Text style={styles.warn}>{unitsError}</Text> : null}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Topic</Text>
          <MultiSelectBlock
            testID="from-books-topics"
            disabled={topicGate.disabled}
            placeholder={topicGate.placeholder}
            options={topics.map((t) => t.label)}
            selected={selTopics}
            onToggle={(label) => {
              toggleLabel(selTopics, label, (next) => {
                setSelTopics(next);
                setSelSubtopics([]);
              });
            }}
            customValue={customTopic}
            customPlaceholder="Add custom topic"
            onCustomChange={setCustomTopic}
            onCustomAdd={() =>
              addCustom(customTopic, selTopics, (next) => {
                setSelTopics(next);
                setSelSubtopics([]);
              }, () => setCustomTopic(''))
            }
            styles={styles}
            colors={colors}
          />
          {curriculumAlignmentEnabled && !topicsLoading && topicsInfo ? (
            <Text style={styles.hint}>{topicsInfo}</Text>
          ) : null}

          <Text style={styles.sectionTitle}>Sub topic</Text>
          <MultiSelectBlock
            testID="from-books-subtopics"
            disabled={subtopicGate.disabled}
            placeholder={subtopicGate.placeholder}
            options={subtopics.map((t) => t.label)}
            selected={selSubtopics}
            onToggle={(label) => toggleLabel(selSubtopics, label, setSelSubtopics)}
            customValue={customSubtopic}
            customPlaceholder="Add custom sub topic"
            onCustomChange={setCustomSubtopic}
            onCustomAdd={() =>
              addCustom(customSubtopic, selSubtopics, setSelSubtopics, () => setCustomSubtopic(''))
            }
            styles={styles}
            colors={colors}
          />

          <SelectBlock
            label="Language"
            testID="from-books-language"
            placeholder="Language"
            value={language}
            options={LANGUAGE_OPTIONS.map((l) => ({ value: l.value, label: l.label }))}
            onChange={setLanguage}
            styles={styles}
            colors={colors}
          />

          <Text style={styles.sectionTitle}>Difficulty Level</Text>
          <View style={styles.chipRow}>
            {LEVELS.map((lv) => (
              <TouchableOpacity
                key={lv}
                testID={`from-books-difficulty-${lv}`}
                style={[styles.chip, difficulty === lv && styles.chipActive]}
                onPress={() => setDifficulty(lv)}
              >
                <Text style={[styles.chipText, difficulty === lv && styles.chipTextActive]}>
                  {lv.charAt(0).toUpperCase() + lv.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Number of Questions</Text>
          <View style={styles.chipRow}>
            {COUNT_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                testID={`from-books-count-${n}`}
                style={[styles.chip, questionCount === n && styles.countActive]}
                onPress={() => setQuestionCount(n)}
              >
                <Text style={[styles.chipText, questionCount === n && styles.countTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            Additional Instructions{curriculumAlignmentEnabled ? '' : ' *'}
          </Text>
          <TextInput
            testID="curriculum-additional-instructions"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="summary"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[
              styles.input,
              !instructions.trim() && !curriculumAlignmentEnabled ? styles.inputInvalid : null,
              { color: colors.text, backgroundColor: colors.card, borderColor: colors.border },
            ]}
          />
          {!instructions.trim() && !curriculumAlignmentEnabled ? (
            <Text style={styles.errorInline}>Additional instructions are required (default: summary)</Text>
          ) : null}

          {curriculumAlignmentEnabled ? (
            <Text style={styles.hint}>
              Questions will be grounded in matching content from your saved books and aligned to the selected curriculum unit.
            </Text>
          ) : null}

          {generateError ? <Text style={styles.errorBox}>{generateError}</Text> : null}
          {underfillWarning ? <Text style={styles.warn}>{underfillWarning}</Text> : null}

          <TouchableOpacity
            testID="from-books-generate"
            accessibilityRole="button"
            accessibilityLabel="Generate Assessment"
            style={[styles.generateBtn, (!isFileAssessmentReady || isGenerating) && { opacity: 0.55 }]}
            disabled={!isFileAssessmentReady || isGenerating}
            onPress={() => void onGenerate()}
          >
            {isGenerating ? (
              <View style={styles.generateBusy}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.generateText}>{stageLabel || 'Generating…'}</Text>
              </View>
            ) : (
              <Text style={styles.generateText}>✨ Generate Assessment</Text>
            )}
          </TouchableOpacity>

          {!curriculumAlignmentEnabled && !isFileFormReady ? (
            <View style={styles.warnBox}>
              {offErrors.map((message) => (
                <Text key={message} style={styles.warn}>
                  • {message}
                </Text>
              ))}
            </View>
          ) : null}
          {curriculumAlignmentEnabled && !isFileCurriculumAssessmentReady ? (
            <View style={styles.warnBox}>
              <Text style={styles.warn}>
                {catalogLoading
                  ? '• Loading curriculum catalog…'
                  : catalogError
                    ? `• ${catalogError}`
                    : '• Select Board, Class, Subject, Curriculum Version, and Unit'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function SelectBlock({
  label,
  testID,
  placeholder,
  value,
  options,
  onChange,
  disabled,
  styles,
  colors,
}: {
  label: string;
  testID: string;
  placeholder: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  styles: ReturnType<typeof makeStyles>;
  colors: Record<string, string>;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.section} testID={testID}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={{ opacity: disabled ? 0.6 : 1 }}>
        <Text style={styles.selectedValue}>{selected?.label || placeholder}</Text>
        {disabled
          ? null
          : options.map((opt) => {
              const active = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  testID={`${testID}-option-${opt.value}`}
                  style={[styles.optionRow, active && styles.optionRowActive]}
                  onPress={() => onChange(opt.value)}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
      </View>
    </View>
  );
}

function MultiSelectBlock({
  testID,
  placeholder,
  options,
  selected,
  onToggle,
  disabled,
  customValue,
  customPlaceholder,
  onCustomChange,
  onCustomAdd,
  styles,
  colors,
}: {
  testID: string;
  placeholder: string;
  options: string[];
  selected: string[];
  onToggle: (label: string) => void;
  disabled?: boolean;
  customValue: string;
  customPlaceholder: string;
  onCustomChange: (v: string) => void;
  onCustomAdd: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: Record<string, string>;
}) {
  return (
    <View style={styles.section} testID={testID}>
      <Text style={styles.selectedValue}>
        {selected.length ? selected.join(', ') : placeholder}
      </Text>
      {disabled
        ? null
        : options.map((label) => {
            const active = selected.includes(label);
            return (
              <TouchableOpacity
                key={label}
                testID={`${testID}-option-${label}`}
                style={[styles.optionRow, active && styles.optionRowActive]}
                onPress={() => onToggle(label)}
              >
                <Ionicons
                  name={active ? 'checkbox' : 'square-outline'}
                  size={16}
                  color={active ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.optionLabel}>{label}</Text>
              </TouchableOpacity>
            );
          })}
      {!disabled ? (
        <View style={styles.customRow}>
          <TextInput
            testID={`${testID}-custom`}
            value={customValue}
            onChangeText={onCustomChange}
            placeholder={customPlaceholder}
            placeholderTextColor={colors.textSecondary}
            style={[styles.customInput, { color: colors.text, borderColor: colors.border }]}
          />
          <TouchableOpacity testID={`${testID}-custom-add`} onPress={onCustomAdd} style={styles.customAdd}>
            <Text style={styles.customAddText}>Add</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: Record<string, string>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 8,
    },
    backBtn: { padding: 8 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
    embeddedToolbar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    alignmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    alignmentTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
    alignmentSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    alignmentState: { fontSize: 11, fontWeight: '700', color: colors.primary, minWidth: 28 },
    link: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    body: { padding: 16, paddingBottom: 48 },
    groupTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 },
    section: { marginBottom: 14 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
    selectedValue: { fontSize: 13, color: colors.text, marginBottom: 6 },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionRowActive: { backgroundColor: colors.surface },
    optionLabel: { flex: 1, color: colors.text, fontSize: 14 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.tintBlue ?? colors.card },
    chipText: { color: colors.text, fontSize: 12, textTransform: 'capitalize' },
    chipTextActive: { color: colors.primary, fontWeight: '700' },
    countActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    countTextActive: { color: '#fff', fontWeight: '700' },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 62,
      textAlignVertical: 'top',
      fontSize: 14,
      marginBottom: 8,
    },
    inputInvalid: { borderColor: '#fecaca' },
    customRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
    customInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
    },
    customAdd: { paddingHorizontal: 12, paddingVertical: 8 },
    customAddText: { color: colors.primary, fontWeight: '700' },
    hint: { fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginBottom: 10 },
    warn: { fontSize: 11, color: '#92400e', lineHeight: 16 },
    warnBox: {
      marginTop: 8,
      padding: 10,
      backgroundColor: '#fffbeb',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#fde68a',
    },
    errorBox: {
      marginBottom: 8,
      padding: 10,
      backgroundColor: '#fff1f2',
      borderRadius: 6,
      color: '#be123c',
      fontSize: 12,
    },
    errorInline: { fontSize: 10, color: '#be123c', marginBottom: 8 },
    generateBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    generateBusy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    generateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
