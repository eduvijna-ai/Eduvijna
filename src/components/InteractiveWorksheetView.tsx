/**
 * Interactive worksheet — answer questions, submit for evaluation, show results.
 * Mirrors Quiz-React WorksheetTab.tsx data flow and section order.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MathRenderer from './MathRenderer';
import WorksheetMcqCard from './WorksheetMcqCard';
import { evaluateWorksheet, updateAssessmentResponses } from '../core/services/sharedApi';
import {
  buildAnswersPayload,
  decodeWorksheetSubmissionState,
  encodeWorksheetSubmissionState,
  WORKSHEET_SUBMISSION_KEY,
} from '../core/utils/worksheetShareUtils';
import type {
  WorksheetAnswers,
  WorksheetDataShape,
  WorksheetQuestionResult,
  WorksheetSectionKey,
} from '../core/types/worksheet.types';

interface ThemeColors {
  text: string;
  textSecondary: string;
  background: string;
  card: string;
  border: string;
  primary: string;
}

interface InteractiveWorksheetViewProps {
  worksheetData: WorksheetDataShape;
  colors: ThemeColors;
  assessmentId?: number | null;
  savedResponses?: Record<string, string> | null;
  reviewMode?: boolean;
  bottomInset?: number;
}

const emptyAnswers = (): WorksheetAnswers => ({});

export default function InteractiveWorksheetView({
  worksheetData,
  colors,
  assessmentId,
  savedResponses,
  reviewMode = false,
  bottomInset = 0,
}: InteractiveWorksheetViewProps) {
  const savedState = useMemo(
    () => decodeWorksheetSubmissionState(savedResponses),
    [savedResponses],
  );

  const [userAnswers, setUserAnswers] = useState<WorksheetAnswers>(
    () => savedState?.answers ?? emptyAnswers(),
  );
  const [isSubmitted, setIsSubmitted] = useState(() => !!savedState?.evaluation);
  const [evaluation, setEvaluation] = useState<{
    results: WorksheetQuestionResult[];
    totalMarks: number;
    maxMarks: number;
    percentage: number;
  } | null>(() => savedState?.evaluation ?? null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');

  const { Metadata, Worksheet: ws, AnswerKey, Explanations } = worksheetData;
  const answerKey = (AnswerKey ?? {}) as Record<string, unknown>;
  const explanations = (Explanations ?? {}) as Record<string, unknown>;

  const getAnswer = useCallback(
    (section: WorksheetSectionKey, id: number) => userAnswers[section]?.[id] ?? '',
    [userAnswers],
  );

  const setAnswer = useCallback((section: WorksheetSectionKey, id: number, value: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [section]: { ...(prev[section] ?? {}), [id]: value },
    }));
  }, []);

  const getResult = useCallback(
    (section: WorksheetSectionKey, id: number) =>
      evaluation?.results.find((r) => r.section === section && r.id === id),
    [evaluation],
  );

  const findAnswerKeyItem = (section: string, id: number) => {
    const sectionItems = answerKey[section];
    if (!Array.isArray(sectionItems)) return undefined;
    return sectionItems.find((item: { id?: number }) => item.id === id);
  };

  const findExplanationItem = (section: string, id: number) => {
    const sectionItems = explanations[section];
    if (!Array.isArray(sectionItems)) return undefined;
    return sectionItems.find((item: { id?: number }) => item.id === id);
  };

  const handleSubmit = async () => {
    setEvalError('');
    setIsEvaluating(true);
    try {
      const payload = buildAnswersPayload(userAnswers);
      const res = await evaluateWorksheet(worksheetData, payload);
      const evalState = {
        results: res.results,
        totalMarks: res.totalMarks,
        maxMarks: res.maxMarks,
        percentage: res.percentage,
      };
      setEvaluation(evalState);
      setIsSubmitted(true);

      if (assessmentId && !reviewMode) {
        await updateAssessmentResponses(
          assessmentId,
          encodeWorksheetSubmissionState(userAnswers, evalState),
        );
      }
    } catch (err: any) {
      setEvalError(err?.message || 'Failed to evaluate worksheet');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRetake = () => {
    setUserAnswers(emptyAnswers());
    setIsSubmitted(false);
    setEvaluation(null);
    setEvalError('');
    if (assessmentId && !reviewMode) {
      updateAssessmentResponses(assessmentId, { [WORKSHEET_SUBMISSION_KEY]: '' }).catch(() => {});
    }
  };

  const questionBorder = (section: WorksheetSectionKey, id: number) => {
    const result = getResult(section, id);
    if (!isSubmitted || !result) return colors.border;
    return result.isCorrect ? '#10b981' : '#ef4444';
  };

  const renderResultBadge = (section: WorksheetSectionKey, id: number) => {
    const result = getResult(section, id);
    if (!isSubmitted || !result) return null;
    const isCorrect = result.isCorrect;
    return (
      <View
        style={[
          styles.resultBadge,
          { backgroundColor: isCorrect ? '#ecfdf5' : '#fef2f2', borderColor: isCorrect ? '#a7f3d0' : '#fecaca' },
        ]}
      >
        <View style={styles.resultBadgeRow}>
          <Text style={[styles.resultBadgeTitle, { color: isCorrect ? '#065f46' : '#991b1b' }]}>
            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </Text>
          <Text style={styles.resultMarks}>
            {result.marksObtained}/{result.maxMarks} marks
          </Text>
        </View>
        {result.feedback ? (
          <Text style={[styles.resultFeedback, { color: colors.text }]}>{result.feedback}</Text>
        ) : null}
      </View>
    );
  };

  const renderAnswerKey = (label: string, value: string, explanation?: string) => {
    if (!isSubmitted || !value) return null;
    return (
      <View style={styles.answerKeyBox}>
        <Text style={styles.answerKeyLabel}>{label}: </Text>
        <MathRenderer text={value} colors={colors} />
        {explanation ? (
          <View style={styles.explanationRow}>
            <Text style={styles.answerKeyLabel}>Explanation: </Text>
            <MathRenderer text={explanation} colors={colors} />
          </View>
        ) : null}
      </View>
    );
  };

  const renderRadioOption = (
    section: WorksheetSectionKey,
    questionId: number,
    value: string,
    label: string,
    selected: string,
  ) => {
    const isSelected = selected === value;
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.radioRow,
          isSelected && { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
        ]}
        onPress={() => !isSubmitted && setAnswer(section, questionId, value)}
        disabled={isSubmitted}
        activeOpacity={0.7}
      >
        <View style={[styles.radioOuter, isSelected && { borderColor: colors.primary }]}>
          {isSelected ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
        </View>
        <Text style={[styles.radioLabel, { color: colors.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderTextInput = (
    section: WorksheetSectionKey,
    id: number,
    minHeight: number,
    placeholder: string,
  ) => (
    <TextInput
      style={[
        styles.textInput,
        { minHeight, borderColor: colors.border, backgroundColor: colors.card, color: colors.text },
      ]}
      value={getAnswer(section, id)}
      onChangeText={(t) => setAnswer(section, id, t)}
      editable={!isSubmitted}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      multiline
      textAlignVertical="top"
    />
  );

  const renderMCQSection = () => {
    const questions = ws.Section_A_MCQ;
    if (!questions?.length) return null;
    return (
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Section A: Multiple Choice Questions</Text>
        {questions.map((q, idx) => {
          const answer = findAnswerKeyItem('Section_A_MCQ', q.id) as { correctAnswer?: string } | undefined;
          const explanation = findExplanationItem('Section_A_MCQ', q.id) as { explanation?: string } | undefined;
          const selected = getAnswer('Section_A_MCQ', q.id);
          const borderColor = questionBorder('Section_A_MCQ', q.id);
          const result = getResult('Section_A_MCQ', q.id);

          return (
            <View
              key={q.id}
              style={[
                styles.questionCard,
                { borderColor, backgroundColor: colors.card, borderLeftWidth: isSubmitted && result ? 4 : 1 },
              ]}
            >
              <WorksheetMcqCard
                questionNumber={idx + 1}
                question={q.question}
                options={q.options}
                selected={selected}
                onSelect={(letter) => setAnswer('Section_A_MCQ', q.id, letter)}
                disabled={isSubmitted}
                colors={colors}
              />
              {renderResultBadge('Section_A_MCQ', q.id)}
              {renderAnswerKey('Answer', answer?.correctAnswer || '', explanation?.explanation)}
            </View>
          );
        })}
      </View>
    );
  };

  const renderFillInTheBlanksSection = () => {
    const questions = ws.Section_B_Fill_in_the_Blank;
    if (!questions?.length) return null;
    return (
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Section B: Fill in the Blanks</Text>
        {questions.map((q: any, idx: number) => {
          const answer = findAnswerKeyItem('Section_B_Fill_in_the_Blank', q.id) as { correctAnswer?: string } | undefined;
          const explanation = findExplanationItem('Section_B_Fill_in_the_Blank', q.id) as { explanation?: string } | undefined;
          const result = getResult('Section_B_Fill_in_the_Blank', q.id);
          return (
            <View
              key={q.id}
              style={[
                styles.questionCard,
                {
                  borderColor: questionBorder('Section_B_Fill_in_the_Blank', q.id),
                  backgroundColor: colors.card,
                  borderLeftWidth: isSubmitted && result ? 4 : 1,
                },
              ]}
            >
              <MathRenderer text={`Q${idx + 1}. ${q.question}`} colors={colors} />
              {renderTextInput('Section_B_Fill_in_the_Blank', q.id, 44, 'Type your answer')}
              {renderResultBadge('Section_B_Fill_in_the_Blank', q.id)}
              {renderAnswerKey('Answer', answer?.correctAnswer || '', explanation?.explanation)}
            </View>
          );
        })}
      </View>
    );
  };

  const renderTrueFalseSection = () => {
    const questions = ws.Section_C_True_False;
    if (!questions?.length) return null;
    return (
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Section C: True or False</Text>
        {questions.map((q: any, idx: number) => {
          const answer = findAnswerKeyItem('Section_C_True_False', q.id) as { correctAnswer?: string } | undefined;
          const explanation = findExplanationItem('Section_C_True_False', q.id) as { explanation?: string } | undefined;
          const selected = getAnswer('Section_C_True_False', q.id);
          const result = getResult('Section_C_True_False', q.id);
          return (
            <View
              key={q.id}
              style={[
                styles.questionCard,
                {
                  borderColor: questionBorder('Section_C_True_False', q.id),
                  backgroundColor: colors.card,
                  borderLeftWidth: isSubmitted && result ? 4 : 1,
                },
              ]}
            >
              <MathRenderer text={`Q${idx + 1}. ${q.question}`} colors={colors} />
              <View style={styles.optionsWrap}>
                {renderRadioOption('Section_C_True_False', q.id, 'True', 'True', selected)}
                {renderRadioOption('Section_C_True_False', q.id, 'False', 'False', selected)}
              </View>
              {renderResultBadge('Section_C_True_False', q.id)}
              {renderAnswerKey('Answer', answer?.correctAnswer || '', explanation?.explanation)}
            </View>
          );
        })}
      </View>
    );
  };

  const renderShortQuestionsSection = () => {
    const questions = ws.Section_D_Short_Questions;
    if (!questions?.length) return null;
    return (
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Section D: Short Answer Questions</Text>
        {questions.map((q, idx) => {
          const answer = findAnswerKeyItem('Section_D_Short_Questions', q.id) as { modelAnswer?: string } | undefined;
          const explanation = findExplanationItem('Section_D_Short_Questions', q.id) as { explanation?: string } | undefined;
          const result = getResult('Section_D_Short_Questions', q.id);
          return (
            <View
              key={q.id}
              style={[
                styles.questionCard,
                {
                  borderColor: questionBorder('Section_D_Short_Questions', q.id),
                  backgroundColor: colors.card,
                  borderLeftWidth: isSubmitted && result ? 4 : 1,
                },
              ]}
            >
              <MathRenderer text={`Q${idx + 1}. ${q.question}`} colors={colors} />
              {renderTextInput('Section_D_Short_Questions', q.id, 70, 'Type your short answer…')}
              {renderResultBadge('Section_D_Short_Questions', q.id)}
              {renderAnswerKey('Model Answer', answer?.modelAnswer || '', explanation?.explanation)}
            </View>
          );
        })}
      </View>
    );
  };

  const renderLongQuestionsSection = () => {
    const questions = ws.Section_F_Long_Questions || [];
    if (!questions.length) return null;
    return (
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Section F: Long Answer Questions</Text>
        {questions.map((q, idx) => {
          const answer = findAnswerKeyItem('Section_F_Long_Questions', q.id) as { modelAnswer?: string } | undefined;
          const explanation = findExplanationItem('Section_F_Long_Questions', q.id) as { explanation?: string } | undefined;
          const result = getResult('Section_F_Long_Questions', q.id);
          return (
            <View
              key={q.id}
              style={[
                styles.questionCard,
                {
                  borderColor: questionBorder('Section_F_Long_Questions', q.id),
                  backgroundColor: colors.card,
                  borderLeftWidth: isSubmitted && result ? 4 : 1,
                },
              ]}
            >
              <MathRenderer text={`Q${idx + 1}. ${q.question}`} colors={colors} />
              {renderTextInput('Section_F_Long_Questions', q.id, 120, 'Type your detailed answer…')}
              {renderResultBadge('Section_F_Long_Questions', q.id)}
              {renderAnswerKey('Model Answer', answer?.modelAnswer || '', explanation?.explanation)}
            </View>
          );
        })}
      </View>
    );
  };

  const renderMatchingSection = () => {
    const pairs = ws.Section_E_Matching?.Pairs;
    if (!pairs?.length) return null;
    return (
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Section E: Match the Following</Text>
        {ws.Section_E_Matching?.Instructions ? (
          <View style={styles.instructionsWrap}>
            <MathRenderer text={ws.Section_E_Matching.Instructions} colors={colors} />
          </View>
        ) : null}
        <View style={[styles.matchTable, { borderColor: colors.border }]}>
          <View style={[styles.matchHeaderRow, { backgroundColor: '#f1f5f9', borderBottomColor: colors.border }]}>
            <Text style={styles.matchHeaderCell}>Column A</Text>
            <Text style={styles.matchHeaderCell}>Column B</Text>
          </View>
          {pairs.map((pair: any, idx: number) => (
            <View
              key={idx}
              style={[
                styles.matchRow,
                { backgroundColor: idx % 2 === 0 ? colors.card : '#f8fafc', borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.matchCell}>
                <MathRenderer text={pair.term || pair.left || ''} colors={colors} />
              </View>
              <View style={styles.matchCell}>
                <MathRenderer text={pair.definition || pair.right || ''} colors={colors} />
              </View>
            </View>
          ))}
        </View>
        {pairs.map((pair: any, idx: number) => {
          const pairId = pair.id ?? idx + 1;
          const keyAns = findAnswerKeyItem('Section_E_Matching', pairId) as { correctMatch?: string } | undefined;
          const explanation = findExplanationItem('Section_E_Matching', pairId) as { explanation?: string } | undefined;
          return (
            <View key={pairId} style={styles.matchAnswerBlock}>
              <Text style={[styles.matchAnswerLabel, { color: colors.textSecondary }]}>
                Match for item {pairId} (format: {pairId}-A):
              </Text>
              {renderTextInput('Section_E_Matching', pairId, 44, `e.g. ${pairId}-A`)}
              {renderResultBadge('Section_E_Matching', pairId)}
              {renderAnswerKey('Correct Match', keyAns?.correctMatch || '', explanation?.explanation)}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {isSubmitted && evaluation ? (
        <View style={styles.scoreBanner}>
          <Text style={styles.scoreText}>
            Score: {evaluation.totalMarks}/{evaluation.maxMarks} ({evaluation.percentage}%)
          </Text>
          {!reviewMode ? (
            <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
              <Text style={styles.retakeBtnText}>Retake Worksheet</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {evalError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{evalError}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 + bottomInset }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metaTitle, { color: colors.text }]}>
            {Metadata.Lesson} Worksheet
          </Text>
          <View style={styles.metaRow}>
            {Metadata.Class ? (
              <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
                <Text style={styles.metaBold}>Class:</Text> {Metadata.Class}
              </Text>
            ) : null}
            {Metadata.Subject ? (
              <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
                <Text style={styles.metaBold}>Subject:</Text> {Metadata.Subject}
              </Text>
            ) : null}
            {Metadata.Lesson ? (
              <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
                <Text style={styles.metaBold}>Topic:</Text> {Metadata.Lesson}
              </Text>
            ) : null}
            {Metadata.Difficulty ? (
              <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
                <Text style={styles.metaBold}>Difficulty:</Text> {Metadata.Difficulty}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.worksheetBody, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderMCQSection()}
          {renderFillInTheBlanksSection()}
          {renderTrueFalseSection()}
          {renderShortQuestionsSection()}
          {renderLongQuestionsSection()}
          {renderMatchingSection()}
        </View>
      </ScrollView>

      {!isSubmitted && !reviewMode ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(12, bottomInset) },
          ]}
        >
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isEvaluating}
          >
            {isEvaluating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Worksheet</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scoreBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0',
  },
  scoreText: { fontSize: 15, fontWeight: '800', color: '#065f46' },
  retakeBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 6,
  },
  retakeBtnText: { fontSize: 12, fontWeight: '600', color: '#047857' },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  errorText: { fontSize: 12, color: '#dc2626' },
  metaCard: {
    margin: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  metaTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { fontSize: 12 },
  metaBold: { fontWeight: '600' },
  worksheetBody: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionBlock: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  questionCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  questionNum: { fontSize: 13, fontWeight: '600' },
  questionTextWrap: { flex: 1 },
  optionsWrap: { marginLeft: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  optionLetter: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  optionTextWrap: { flex: 1 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontSize: 13 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 4,
  },
  resultBadge: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  resultBadgeTitle: { fontSize: 12, fontWeight: '700' },
  resultMarks: { fontSize: 12, fontWeight: '600', color: '#475569' },
  resultFeedback: { marginTop: 4, fontSize: 12 },
  answerKeyBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 6,
  },
  answerKeyLabel: { fontSize: 12, fontWeight: '600', color: '#0369a1' },
  explanationRow: { marginTop: 4 },
  instructionsWrap: { marginBottom: 12 },
  matchTable: { borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  matchHeaderRow: { flexDirection: 'row', borderBottomWidth: 1 },
  matchHeaderCell: {
    flex: 1,
    padding: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  matchRow: { flexDirection: 'row', borderBottomWidth: 1 },
  matchCell: { flex: 1, padding: 10 },
  matchAnswerBlock: { marginBottom: 10 },
  matchAnswerLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  submitBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
