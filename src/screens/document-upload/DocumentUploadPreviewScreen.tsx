import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDocumentScreenFocusEffect } from '@core/hooks/useDocumentScreenFocusEffect';
import {
  readDocumentWorkspacePreset,
  withDocumentWorkspaceParams,
} from '@core/utils/documentWorkspaceParams';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import {
  DocumentUploadBook,
  appendCameraPage,
  applyCroppedJpegToCameraPage,
  extractRawContent,
  fetchBookPageImage,
  cameraSelectedPagesFingerprint,
  generateFromBook,
  generateMultimodalAssessmentFromDocument,
  getLocalPageUri,
  isPdfAsset,
  MAX_QUIZ_PAGES,
  MAX_IMAGE_UPLOADS,
  mergeCameraSessionPages,
  normalizeCameraPage,
  remapPageSelectionAfterDelete,
  removeCameraPage,
  resolveServerBook,
  restoreCameraPageOriginal,
  saveImagePagesAsLibraryBook,
  sanitizeCameraDocumentTitle,
  waitForLibraryBookReady,
} from '@core/services/documentUploadApi';
import { compressCameraImage } from '@core/services/documentImageUtils';
import { captureDocumentImage } from '@core/services/documentCameraCapture';
import { openImageCropper } from '@core/services/imageCropSession';
import {
  getDocumentUploadBookById,
  upsertDocumentUploadBook,
  removeDocumentUploadBook,
} from '@core/services/documentUploadStorage';
import { generateWorksheet, saveUserAssessment } from '@core/services/sharedApi';
import FullScreenImagePreview from '@core/components/FullScreenImagePreview';
import { getDocumentUploadFile } from '@core/services/documentUploadSessionFiles';
import { useUserStore } from '@core/store/user.store';
import { sanitizeQuizQuestions } from '@core/utils/quizQuestionUtils';
import DocumentAssessmentInlinePreview from '../../components/document-assessment/DocumentAssessmentInlinePreview';
import DocumentAssessmentActionBar, {
  type DocumentWorkspaceAction,
} from '../../components/document-assessment/DocumentAssessmentActionBar';
import DocumentAssessmentPageStrip from '../../components/document-assessment/DocumentAssessmentPageStrip';
import DocumentAssessmentGenerationSettings from '../../components/document-assessment/DocumentAssessmentGenerationSettings';
import type { DocumentWorkspacePage } from '@core/types/documentAssessmentWorkspace';

const pageItems = (totalPages: number) =>
  Array.from({ length: Math.max(1, totalPages || 1) }, (_, i) => i + 1);

const MATHPIX_USER_MESSAGE =
  'Text extraction from handwritten images is temporarily unavailable. Document Assessment camera pages use the library upload path instead — try Generate again, or use From Books.';

const toUserFacingDocumentError = (raw: string, fallback: string): string => {
  const text = String(raw || '').trim();
  if (!text) return fallback;
  if (/mathpix|MATHPIX_API_KEY|ENABLE_MATHPIX|OCR service is not enabled/i.test(text)) {
    return MATHPIX_USER_MESSAGE;
  }
  return text;
};

const normalizeErrorMessage = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  let raw = '';
  if (typeof detail === 'string' && detail.trim()) {
    raw = detail;
  } else if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message.trim()) {
      const extra = Array.isArray(detail.details)
        ? detail.details.join(', ')
        : typeof detail.details === 'string'
          ? detail.details
          : '';
      raw = extra ? `${detail.message} (${extra})` : detail.message;
    } else {
      try {
        raw = JSON.stringify(detail);
      } catch {
        raw = '';
      }
    }
  } else if (typeof err?.message === 'string' && err.message.trim()) {
    raw = err.message;
  }
  return toUserFacingDocumentError(raw, fallback);
};

const defaultCameraLessonTitle = (book: DocumentUploadBook): string =>
  sanitizeCameraDocumentTitle(book.title || book.originalName);

export default function DocumentUploadPreviewScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  /** Android 3-button nav often reports 0 — keep a minimum clearance above system buttons. */
  const scrollBottomPad = Math.max(insets.bottom + 28, Platform.OS === 'android' ? 48 : 28);
  const schoolId = useUserStore((s) => s.schoolId);

  const book: DocumentUploadBook | undefined = route?.params?.book;
  const assessmentSource: 'Document' | 'Handwritten' =
    route?.params?.assessmentSource === 'Handwritten' ? 'Handwritten' : 'Document';
  const restoredForm = route?.params?.previewFormState as
    | {
        selectedPages?: number[];
        difficulty?: 'easy' | 'medium' | 'hard';
        questionCount?: number;
        classValue?: string;
        classId?: string;
        subject?: string;
        subjectId?: string;
        lesson?: string;
      }
    | undefined;

  const [bookState, setBookState] = useState<DocumentUploadBook | undefined>(book);
  const isCameraSession = bookState?.isCameraSession === true;

  const [page, setPage] = useState(1);
  /** Internal book metadata for APIs only — not shown in generation UI. */
  const [classId, setClassId] = useState(String(restoredForm?.classId ?? ''));
  const [subjectId, setSubjectId] = useState(String(restoredForm?.subjectId ?? ''));
  const [classMeta, setClassMeta] = useState(String(restoredForm?.classValue ?? ''));
  const [subjectMeta, setSubjectMeta] = useState(String(restoredForm?.subject ?? ''));
  const [lesson, setLesson] = useState(String(restoredForm?.lesson ?? ''));
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    restoredForm?.difficulty ?? route?.params?.presetDifficulty ?? 'medium',
  );
  const [questionCount, setQuestionCount] = useState<number>(
    restoredForm?.questionCount ?? route?.params?.presetQuestionCount ?? 5,
  );
  const [additionalInstructions] = useState(
    String(route?.params?.presetInstructions ?? readDocumentWorkspacePreset(route)?.additionalInstructions ?? ''),
  );
  const [selectedPages, setSelectedPages] = useState<Set<number>>(
    () => new Set(restoredForm?.selectedPages?.length ? restoredForm.selectedPages : [1]),
  );
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingWorksheet, setLoadingWorksheet] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [capturingPage, setCapturingPage] = useState(false);
  const [error, setError] = useState('');
  const [thumbImages, setThumbImages] = useState<Record<number, string>>({});
  const [previewImages, setPreviewImages] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [resolvedPageCount, setResolvedPageCount] = useState<number | null>(null);
  const [imageDocIds, setImageDocIds] = useState<string[]>([]);
  const [fullPreviewUri, setFullPreviewUri] = useState<string | null>(null);
  const requestedImages = useRef<Set<string>>(new Set());
  const generateInFlightRef = useRef(false);
  const cameraAddOpIdRef = useRef(0);
  useEffect(() => {
    return () => {
      cameraAddOpIdRef.current += 1;
    };
  }, []);
  /** Cached library upload for camera Document Assessment (invalidated on source edits). */
  const uploadedCameraSourceRef = useRef<{
    docId: string;
    fingerprint: string;
    pageCount: number;
  } | null>(null);

  const invalidateUploadedCameraSource = useCallback(() => {
    uploadedCameraSourceRef.current = null;
  }, []);

  const totalPages = resolvedPageCount ?? bookState?.totalPages ?? 1;
  const docId = bookState?.docId;

  const applyBookFromStorageOrParams = useCallback(async (incoming?: DocumentUploadBook) => {
    if (!incoming?.id) return;
    // Camera sessions are mutated on this screen (add/remove pages) and written
    // to AsyncStorage. Home can still pass a stale in-memory copy — storage wins.
    if (incoming.isCameraSession) {
      const stored = await getDocumentUploadBookById(incoming.id);
      const resolved = stored ?? incoming;
      setBookState(resolved);
      const count = Math.max(1, resolved.totalPages || resolved.pages?.length || 1);
      setPage((p) => Math.min(p, count));
      return;
    }
    setBookState(incoming);
  }, []);

  useEffect(() => {
    void applyBookFromStorageOrParams(route?.params?.book);
  }, [route?.params?.book, applyBookFromStorageOrParams]);

  useDocumentScreenFocusEffect(
    useCallback(() => {
      const incoming = route?.params?.book as DocumentUploadBook | undefined;
      if (!incoming?.isCameraSession || !incoming.id) return undefined;
      let active = true;
      (async () => {
        const stored = await getDocumentUploadBookById(incoming.id);
        if (!active || !stored) return;
        setBookState(stored);
        const count = Math.max(1, stored.totalPages || stored.pages?.length || 1);
        setPage((p) => Math.min(p, count));
      })();
      return () => {
        active = false;
        cameraAddOpIdRef.current += 1;
      };
    }, [route?.params?.book?.id, route?.params?.book?.isCameraSession]),
  );

  useEffect(() => {
    const restored = route?.params?.previewFormState;
    if (!restored) return;
    if (restored.difficulty) setDifficulty(restored.difficulty);
    if (restored.questionCount) setQuestionCount(restored.questionCount);
    if (restored.classValue) setClassMeta(restored.classValue);
    if (restored.classId) setClassId(restored.classId);
    if (restored.subject) setSubjectMeta(restored.subject);
    if (restored.subjectId) setSubjectId(restored.subjectId);
    if (restored.lesson) setLesson(restored.lesson);
    if (restored.selectedPages?.length) {
      setSelectedPages(new Set(restored.selectedPages));
    }
  }, [route?.params?.previewFormState]);

  useEffect(() => {
    if (!bookState) return;
    if (!lesson.trim()) setLesson(defaultCameraLessonTitle(bookState));
    if (isCameraSession && bookState.pages?.length && !route?.params?.previewFormState) {
      setSelectedPages(new Set(bookState.pages.map((p) => p.pageNumber)));
    }
  }, [bookState?.title, bookState?.originalName, isCameraSession, bookState?.pages?.length, route?.params?.previewFormState, lesson]);

  const persistBook = useCallback(async (next: DocumentUploadBook) => {
    const withIdentity =
      next.isCameraSession && next.pages?.length
        ? {
            ...next,
            pages: next.pages.map((p) => normalizeCameraPage(p)),
          }
        : next;
    setBookState(withIdentity);
    await upsertDocumentUploadBook(withIdentity);
    navigation.setParams?.({ book: withIdentity });
  }, [navigation]);

  // Generation UI may hide Class/Subject, but APIs still need metadata when available
  // (workspace preset / restored form / route presets) — never invent values.
  const workspacePreset = readDocumentWorkspacePreset(route);
  const resolvedClass =
    classMeta.trim() ||
    String(route?.params?.presetClass ?? workspacePreset?.classValue ?? '').trim();
  const resolvedSubject =
    subjectMeta.trim() ||
    String(route?.params?.presetSubject ?? workspacePreset?.subject ?? '').trim();
  const resolvedLesson = lesson.trim() || (bookState ? defaultCameraLessonTitle(bookState) : '');

  const syncLocalPageImages = useCallback((bookOverride?: DocumentUploadBook) => {
    const book = bookOverride ?? bookState;
    if (!book) return;
    const pageCount = book.totalPages ?? 1;
    const thumbs: Record<number, string> = {};
    const previews: Record<number, string> = {};
    for (let p = 1; p <= pageCount; p += 1) {
      const uri = getLocalPageUri(book, p);
      if (uri) {
        thumbs[p] = uri;
        previews[p] = uri;
      }
    }
    setThumbImages(thumbs);
    setPreviewImages(previews);
    setLoadingImages(false);
  }, [bookState]);

  // Resolve accurate page count + library file_id for page images (server-backed books only).
  useEffect(() => {
    if (!docId || !bookState || isCameraSession) return;
    let cancelled = false;
    (async () => {
      const serverBook = await resolveServerBook(docId, bookState.originalName || bookState.title);
      if (cancelled) return;
      if (serverBook?.totalPages) {
        setResolvedPageCount(serverBook.totalPages);
      }
      const allIds = [docId, serverBook?.docId].filter(
        (id): id is string => !!id && id.trim().length > 0,
      );
      const uniqueIds = allIds.filter((id, index, list) => list.indexOf(id) === index);
      setImageDocIds(uniqueIds.length > 1 ? uniqueIds.slice(1) : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, bookState?.originalName, bookState?.title, isCameraSession]);

  // Camera sessions and local image files: use on-device URIs immediately.
  useEffect(() => {
    if (!bookState) return;
    if (isCameraSession || !docId || bookState.mimeType?.startsWith('image/')) {
      syncLocalPageImages();
    }
  }, [bookState, isCameraSession, docId, syncLocalPageImages]);

  // Load server page thumbnails for PDF / server-backed documents.
  useEffect(() => {
    if (!docId || isCameraSession) return;
    let cancelled = false;
    setLoadingImages(true);

    const loadImage = async (p: number, size: 'mini' | 'medium') => {
      const key = `${p}:${size}`;
      if (requestedImages.current.has(key)) return;
      requestedImages.current.add(key);
      const [primaryId, ...alternateIds] = [docId, ...imageDocIds].filter(
        (id, index, list) => id && list.indexOf(id) === index,
      );
      const uri = await fetchBookPageImage(primaryId, p, size === 'mini' ? 'mini' : 'medium', alternateIds);
      if (cancelled) return;
      if (!uri) {
        requestedImages.current.delete(key);
        const localUri = getLocalPageUri(bookState, p);
        if (localUri) {
          if (size === 'mini') {
            setThumbImages((prev) => ({ ...prev, [p]: localUri }));
          } else {
            setPreviewImages((prev) => ({ ...prev, [p]: localUri }));
          }
        }
        return;
      }
      if (size === 'mini') {
        setThumbImages((prev) => ({ ...prev, [p]: uri }));
      } else {
        setPreviewImages((prev) => ({ ...prev, [p]: uri }));
      }
    };

    const maxThumbs = Math.min(Math.max(1, totalPages), 24);
    (async () => {
      for (let p = 1; p <= maxThumbs; p += 1) {
        await loadImage(p, 'mini');
      }
      await loadImage(page, 'medium');
      if (!cancelled) setLoadingImages(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [docId, imageDocIds, totalPages, page, isCameraSession, bookState]);

  // Document workspace generation UI omits Class/Subject/Lesson — never submit stale selections.
  useEffect(() => {
    setClassId('');
    setSubjectId('');
  }, [isCameraSession, bookState?.id]);

  const handleCropCurrentPage = async () => {
    if (!bookState?.isCameraSession || capturingPage) return;
    const current = bookState.pages?.find((p) => p.pageNumber === page);
    const sourceUri = current?.fileUri || getLocalPageUri(bookState, page);
    if (!current || !sourceUri) {
      setError('No image available to crop for this page.');
      return;
    }
    const cropOpId = ++cameraAddOpIdRef.current;
    try {
      setError('');
      setCapturingPage(true);
      const result = await openImageCropper(sourceUri, {
        suggestedFileName: current.fileName,
      });
      if (cameraAddOpIdRef.current !== cropOpId) return;
      if (result.kind === 'cancelled' || result.kind === 'retake') return;
      if (result.kind === 'unchanged') {
        // Keep current bytes/MIME — do not relabel as JPEG and do not claim Restore.
        return;
      }
      const targetPageId = current.pageId;
      const latestBook =
        (await getDocumentUploadBookById(bookState.id)) ?? bookState;
      const nextPages = (latestBook.pages || []).map((p) =>
        p.pageId === targetPageId
          ? applyCroppedJpegToCameraPage(p, {
              uri: result.uri,
              fileName: result.fileName,
              mimeType: result.mimeType,
              width: result.width,
              height: result.height,
            })
          : p,
      );
      const next = { ...latestBook, pages: nextPages };
      await persistBook(next);
      if (cameraAddOpIdRef.current !== cropOpId) return;
      invalidateUploadedCameraSource();
      setPreviewImages((prev) => ({ ...prev, [page]: result.uri }));
      setThumbImages((prev) => ({ ...prev, [page]: result.uri }));
    } catch (e: any) {
      if (cameraAddOpIdRef.current === cropOpId) {
        setError(normalizeErrorMessage(e, 'Failed to crop page.'));
      }
    } finally {
      if (cameraAddOpIdRef.current === cropOpId) {
        setCapturingPage(false);
      }
    }
  };

  const handleRestoreCurrentPageOriginal = async () => {
    if (!bookState?.isCameraSession) return;
    const current = bookState.pages?.find((p) => p.pageNumber === page);
    if (!current?.original) {
      setError('No original image available to restore for this page.');
      return;
    }
    try {
      setError('');
      setCapturingPage(true);
      const targetPageId = current.pageId;
      const restored = restoreCameraPageOriginal(current);
      const nextPages = (bookState.pages || []).map((p) =>
        p.pageId === targetPageId ? restored : p,
      );
      const next = { ...bookState, pages: nextPages };
      await persistBook(next);
      invalidateUploadedCameraSource();
      setPreviewImages((prev) => ({ ...prev, [page]: restored.fileUri }));
      setThumbImages((prev) => ({
        ...prev,
        [page]: restored.thumbnailUri || restored.fileUri,
      }));
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to restore original page.'));
    } finally {
      setCapturingPage(false);
    }
  };

  const handleAddCameraPage = async () => {
    if (!bookState?.isCameraSession) return;
    if ((bookState.pages?.length || 0) >= MAX_IMAGE_UPLOADS) {
      setError(`You can capture up to ${MAX_IMAGE_UPLOADS} pages.`);
      return;
    }

    const opId = ++cameraAddOpIdRef.current;
    try {
      setError('');
      setCapturingPage(true);

      const captured = await captureDocumentImage();
      if (!captured || cameraAddOpIdRef.current !== opId) return;

      const newPage = normalizeCameraPage({
        pageNumber: (bookState.pages?.length || 0) + 1,
        fileUri: captured.uri,
        fileName: captured.name,
        mimeType: captured.mimeType || 'image/jpeg',
        thumbnailUri: captured.uri,
      });

      if (cameraAddOpIdRef.current !== opId) return;
      const next = appendCameraPage(bookState, newPage);
      await persistBook(next);
      if (cameraAddOpIdRef.current !== opId) return;
      invalidateUploadedCameraSource();
      setPage(next.totalPages);
      setSelectedPages(new Set(next.pages?.map((p) => p.pageNumber) || [1]));
    } catch (e: any) {
      if (cameraAddOpIdRef.current === opId) {
        setError(normalizeErrorMessage(e, 'Failed to capture page.'));
      }
    } finally {
      if (cameraAddOpIdRef.current === opId) {
        setCapturingPage(false);
      }
    }
  };

  const handleAddGalleryPages = async () => {
    if (!bookState?.isCameraSession) return;
    const existingCount = bookState.pages?.length || 0;
    const remaining = MAX_IMAGE_UPLOADS - existingCount;
    if (remaining <= 0) {
      setError(`You can upload up to ${MAX_IMAGE_UPLOADS} images.`);
      return;
    }

    try {
      setError('');
      setCapturingPage(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Photo library permission is required to pick images.');
        return;
      }

      const galleryResult = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (galleryResult.canceled || !galleryResult.assets?.length) return;

      const pages = [];
      for (let i = 0; i < galleryResult.assets.length; i += 1) {
        const asset = galleryResult.assets[i];
        const normalized = await compressCameraImage(asset.uri, {
          originalName: asset.fileName || `gallery-${Date.now()}-${i}.jpg`,
          sourceMimeType: asset.mimeType,
        });
        pages.push(
          normalizeCameraPage({
            pageNumber: existingCount + i + 1,
            fileUri: normalized.uri,
            fileName: normalized.fileName,
            mimeType: normalized.mimeType,
            thumbnailUri: normalized.uri,
          }),
        );
      }

      const next = mergeCameraSessionPages(bookState, pages);
      await persistBook(next);
      invalidateUploadedCameraSource();
      setPage(next.totalPages);
      setSelectedPages(new Set(next.pages?.map((p) => p.pageNumber) || [1]));
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to add gallery images.'));
    } finally {
      setCapturingPage(false);
    }
  };

  const handleRemoveCameraPage = (pageNumber: number) => {
    if (!bookState?.isCameraSession) return;

    Alert.alert(
      'Remove page?',
      `Remove page ${pageNumber} from this document?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setError('');
              const next = removeCameraPage(bookState, pageNumber);
              if (!next) {
                await removeDocumentUploadBook(bookState.id);
                navigation.navigate('DocumentUploadHomeScreen');
                return;
              }

              const remappedSelection = remapPageSelectionAfterDelete(selectedPages, pageNumber);
              const nextSelected =
                remappedSelection.size > 0
                  ? remappedSelection
                  : new Set(next.pages?.map((p) => p.pageNumber) || [1]);

              await persistBook(next);
              invalidateUploadedCameraSource();
              setSelectedPages(nextSelected);
              setPage((current) => {
                if (current === pageNumber) {
                  return Math.min(pageNumber, next.totalPages);
                }
                if (current > pageNumber) return current - 1;
                return current;
              });
              requestedImages.current.clear();
              setThumbImages({});
              setPreviewImages({});
              syncLocalPageImages(next);
            } catch (e: any) {
              setError(normalizeErrorMessage(e, 'Failed to remove page.'));
            }
          },
        },
      ],
    );
  };

  /**
   * Document Assessment (camera/gallery): selected current images → combined PDF
   * → study-materials upload → generateFromBook with remapped pages 1..N.
   * Does not use Mathpix / batch-ocr (Handwritten path stays separate).
   */
  const ensureCameraLibrarySource = async (): Promise<{
    docId: string;
    serverPageNumbers: number[];
    selectedPageObjs: NonNullable<DocumentUploadBook['pages']>;
  }> => {
    if (!bookState?.isCameraSession || !bookState.pages?.length) {
      throw new Error('No camera pages available.');
    }
    const selectedPageObjs = bookState.pages
      .filter((p) => selectedPages.has(p.pageNumber))
      .sort((a, b) => a.pageNumber - b.pageNumber);
    if (selectedPageObjs.length === 0) {
      throw new Error('Please select at least one page.');
    }

    const fingerprint = cameraSelectedPagesFingerprint(selectedPageObjs);
    const cached = uploadedCameraSourceRef.current;
    if (cached && cached.fingerprint === fingerprint && cached.docId) {
      const serverPageNumbers = selectedPageObjs.map((_, idx) => idx + 1);
      return { docId: cached.docId, serverPageNumbers, selectedPageObjs };
    }

    setProcessingStatus('Uploading selected pages to document library…');
    const uploaded = await saveImagePagesAsLibraryBook({
      imageUris: selectedPageObjs.map((p) => p.fileUri),
      mimeTypes: selectedPageObjs.map((p) => p.mimeType || 'image/jpeg'),
      title: bookState.title || defaultCameraLessonTitle(bookState),
      gradeLevel: resolvedClass,
      subject: resolvedSubject,
      lessonTitle: resolvedLesson || bookState.title || defaultCameraLessonTitle(bookState),
    });
    if (!uploaded.docId) {
      throw new Error('Upload succeeded but no document id was returned. Please try again.');
    }

    setProcessingStatus('Processing uploaded document…');
    const ready = await waitForLibraryBookReady({
      docId: uploaded.docId,
      expectedPages: selectedPageObjs.length,
    });
    const pageCount = Math.max(selectedPageObjs.length, ready.totalPages || selectedPageObjs.length);
    uploadedCameraSourceRef.current = {
      docId: ready.docId || uploaded.docId,
      fingerprint,
      pageCount,
    };
    // PDF contains only selected images in display order → remap to 1..N.
    const serverPageNumbers = selectedPageObjs.map((_, idx) => idx + 1);
    return {
      docId: ready.docId || uploaded.docId,
      serverPageNumbers,
      selectedPageObjs,
    };
  };

  const goBackHome = () => {
    navigation.navigate('DocumentUploadHomeScreen');
  };

  const handleGenerateQuiz = async () => {
    if (generateInFlightRef.current) return;

    const pageNumbers = Array.from(selectedPages).sort((a, b) => a - b);
    const useServerBook =
      !!bookState?.docId && isPdfAsset(bookState.originalName, bookState.mimeType) && !isCameraSession;

    if (!isCameraSession && !useServerBook && !bookState?.fileUri) {
      setError('Original file reference is not available. Please upload again from Document Upload Home.');
      return;
    }

    if (selectedPages.size === 0) {
      setError('Please select at least one page to generate the assessment.');
      return;
    }

    generateInFlightRef.current = true;
    try {
      setError('');
      setLoadingQuiz(true);

      let questions: Array<{
        id: string;
        question: string;
        options: string[];
        correctAnswer: string;
        answer: string;
        explanation: string | null;
      }> = [];

      let libraryDocId: string | undefined;
      let cameraServerPages: number[] | undefined;

      if (isCameraSession) {
        const source = await ensureCameraLibrarySource();
        libraryDocId = source.docId;
        cameraServerPages = source.serverPageNumbers;
        setProcessingStatus('Generating assessment…');
        const result = await generateFromBook({
          docId: source.docId,
          pageNumbers: source.serverPageNumbers,
          questionCount,
          difficulty,
          subject: resolvedSubject,
          gradeLevel: resolvedClass,
          lessonTitle: resolvedLesson,
          additionalInstructions,
        });
        questions = result.questions;
      } else if (useServerBook && bookState.docId) {
        const result = await generateFromBook({
          docId: bookState.docId,
          pageNumbers,
          questionCount,
          difficulty,
          subject: resolvedSubject,
          gradeLevel: resolvedClass,
          lessonTitle: resolvedLesson,
          additionalInstructions,
        });
        questions = result.questions;
      } else if (bookState?.fileUri) {
        const uploadFile = getDocumentUploadFile(bookState.id);
        const result = await generateMultimodalAssessmentFromDocument({
          fileUri: bookState.fileUri,
          fileName: bookState.originalName || 'document.pdf',
          mimeType: bookState.mimeType || 'application/pdf',
          file: uploadFile,
          questionCount,
          difficulty,
          language: 'English',
          subject: resolvedSubject,
          gradeLevel: resolvedClass,
          lessonTitle: resolvedLesson,
          selectedPages: pageNumbers,
          additionalInstructions,
        });
        questions = result.quizData.questions;
      }

      if (!questions.length) {
        setError('Assessment generation returned no questions. Please try another file or configuration.');
        return;
      }

      questions = sanitizeQuizQuestions(questions);
      if (!questions.length) {
        setError('Assessment questions were invalid. Please try generating again.');
        return;
      }

      await saveUserAssessment({
        title: bookState.title || bookState.originalName,
        subject: resolvedSubject,
        class_name: resolvedClass,
        level: difficulty,
        lesson: resolvedLesson,
        assessment_type: 'web-quiz',
        source:
          assessmentSource === 'Handwritten' ? 'Handwritten' : 'Doc-File-Assessment',
        school_id: schoolId,
        questions: questions.map((q) => ({
          quiz: {
            question: q.question,
            options: q.options,
            answer: q.correctAnswer,
            explanation: q.explanation,
          },
          answer: q.correctAnswer,
        })),
      });

      navigation.navigate(
        'DocumentUploadQuizScreen',
        withDocumentWorkspaceParams(route, {
        quizData: {
          id: libraryDocId || bookState.docId || bookState.id,
          title: bookState.title || bookState.originalName,
          class: resolvedClass,
          subject: resolvedSubject,
          difficulty,
          lesson: resolvedLesson,
          questions,
          regenerationParams: {
            type: 'document-upload',
            fileName: bookState.originalName || 'document.pdf',
            grade: resolvedClass,
            subject: resolvedSubject,
            level: difficulty,
            lesson: resolvedLesson,
            count: questionCount,
            selectedPages: isCameraSession ? cameraServerPages || pageNumbers : pageNumbers,
            isCameraSession,
            docId: useServerBook ? bookState.docId : libraryDocId,
            useServerBook: !!useServerBook || !!libraryDocId,
            fileUri: !isCameraSession && !useServerBook ? bookState.fileUri : undefined,
            mimeType: libraryDocId ? 'application/pdf' : bookState.mimeType,
          },
        },
        previewBook: bookState,
        returnScreen: 'DocumentUploadPreviewScreen',
        previewFormState: {
          selectedPages: pageNumbers,
          difficulty,
          questionCount,
          classValue: resolvedClass,
          classId,
          subject: resolvedSubject,
          subjectId,
          lesson: resolvedLesson,
        },
        source: 'document-upload',
        workspaceMode: assessmentSource === 'Handwritten' ? 'handwritten' : 'document',
        showShareButton: true,
        showActionButtons: true,
      }),
      );
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to generate quiz.'));
    } finally {
      generateInFlightRef.current = false;
      setLoadingQuiz(false);
      setProcessingStatus('');
    }
  };

  const handleGenerateWorksheet = async () => {
    if (generateInFlightRef.current) return;
    if (selectedPages.size === 0) {
      setError('Please select at least one page before generating worksheet.');
      return;
    }

    generateInFlightRef.current = true;
    try {
      setError('');
      setLoadingWorksheet(true);

      let rawContent = '';
      if (isCameraSession) {
        const source = await ensureCameraLibrarySource();
        setProcessingStatus('Extracting text from uploaded pages…');
        rawContent = await extractRawContent({
          docId: source.docId,
          pageNumbers: source.serverPageNumbers,
        });
        if (!rawContent.trim()) {
          throw new Error(
            'Could not extract text from the uploaded pages. Try clearer photos or fewer pages.',
          );
        }
        setProcessingStatus('Generating worksheet…');
      } else if (bookState?.docId) {
        rawContent = await extractRawContent({
          docId: bookState.docId,
          pageNumbers: Array.from(selectedPages).sort((a, b) => a - b),
        });
      }

      const worksheet = await generateWorksheet({
        class: resolvedClass,
        subject: resolvedSubject,
        lesson: resolvedLesson,
        itext: rawContent,
        level: difficulty,
        count: questionCount,
        mcq_count: Math.ceil(questionCount * 0.4),
        fitb_count: Math.ceil(questionCount * 0.2),
        tf_count: Math.floor(questionCount * 0.1),
        short_q_count: Math.floor(questionCount * 0.2),
        matching_count: Math.floor(questionCount * 0.1),
        type: 'worksheet',
      });

      const wsData = worksheet?.WorksheetData;
      if (wsData) {
        await saveUserAssessment({
          title: `${bookState?.title || 'Document'} Worksheet`,
          subject: wsData.Metadata?.Subject || 'Document',
          class_name: wsData.Metadata?.Class || resolvedClass,
          level: wsData.Metadata?.Difficulty || difficulty,
          lesson: wsData.Metadata?.Lesson || bookState?.title,
          assessment_type: 'worksheet',
          source: 'Doc-File-Worksheet',
          school_id: schoolId,
          questions: [
            {
              quiz: {
                question: '__WS_DATA__' + JSON.stringify(wsData),
                options: [],
                answer: 'A',
              },
              answer: 'A',
            },
          ],
        });
      }

      navigation.navigate(
        'WorksheetScreen',
        withDocumentWorkspaceParams(route, {
          worksheetData: worksheet,
          title: `${bookState?.title || 'Document'} Worksheet`,
          selectedPages: Array.from(selectedPages).sort((a, b) => a - b),
        }),
      );
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to generate worksheet.'));
    } finally {
      generateInFlightRef.current = false;
      setLoadingWorksheet(false);
      setProcessingStatus('');
    }
  };

  if (!bookState) {
    return (
      <View style={styles.centerEmpty}>
        <Text style={styles.emptyTitle}>No document selected</Text>
        <TouchableOpacity style={styles.primaryAction} onPress={goBackHome}>
          <Text style={styles.primaryActionText}>Back to Upload</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const togglePageSelection = (p: number) => {
    setError('');
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        if (next.size >= MAX_QUIZ_PAGES) {
          setError(`You can select up to ${MAX_QUIZ_PAGES} pages at a time.`);
          return prev;
        }
        next.add(p);
      }
      return next;
    });
  };

  const pageList = pageItems(totalPages);
  const focusedCameraPage = bookState?.pages?.find((p) => p.pageNumber === page);
  const cameraPageFileUri = focusedCameraPage?.fileUri;
  const previewUri =
    cameraPageFileUri ||
    previewImages[page] ||
    thumbImages[page] ||
    getLocalPageUri(bookState, page);

  const openFullPreview = (uri?: string | null) => {
    if (!uri) return;
    setFullPreviewUri(uri);
  };

  const workspacePages: DocumentWorkspacePage[] = pageList.map((p) => {
    const cam = bookState?.pages?.find((pg) => pg.pageNumber === p);
    return {
      pageId: cam?.pageId || `${bookState.id}:${p}`,
      pageNumber: p,
      uri: cam?.fileUri || previewImages[p] || thumbImages[p] || getLocalPageUri(bookState, p),
      thumbnailUri: cam?.thumbnailUri || thumbImages[p] || cam?.fileUri || previewImages[p],
      fileName: cam?.fileName,
      mimeType: cam?.mimeType,
      width: cam?.width,
      height: cam?.height,
      editable: isCameraSession,
    };
  });

  const imageVersionKey = focusedCameraPage
    ? `${focusedCameraPage.fileUri}|${focusedCameraPage.width || 0}x${focusedCameraPage.height || 0}`
    : previewUri || '';

  const canRestoreFocused =
    !!focusedCameraPage?.original &&
    focusedCameraPage.fileUri !== focusedCameraPage.original.fileUri;

  const toggleSelectAll = () => {
    setError('');
    if (selectedPages.size > 0) {
      setSelectedPages(new Set());
      return;
    }
    setSelectedPages(new Set(pageList.slice(0, MAX_QUIZ_PAGES)));
  };

  const workspaceActions = [
    ...(isCameraSession
      ? [
          {
            key: 'gallery',
            label: 'Gallery',
            icon: 'images-outline' as const,
            onPress: handleAddGalleryPages,
            disabled: capturingPage || (bookState.pages?.length || 0) >= MAX_IMAGE_UPLOADS,
            loading: capturingPage,
          },
          {
            key: 'add',
            label: `Add (${bookState.pages?.length || 0}/${MAX_IMAGE_UPLOADS})`,
            icon: 'camera-outline' as const,
            onPress: handleAddCameraPage,
            disabled: capturingPage || (bookState.pages?.length || 0) >= MAX_IMAGE_UPLOADS,
            loading: capturingPage,
          },
          {
            key: 'crop',
            label: 'Crop',
            icon: 'crop-outline' as const,
            onPress: handleCropCurrentPage,
            disabled: capturingPage || !(bookState.pages?.length),
            testID: 'document-preview-crop-page',
            accessibilityLabel: 'Crop selected page',
          },
          {
            key: 'restore',
            label: 'Restore',
            icon: 'refresh-outline' as const,
            onPress: handleRestoreCurrentPageOriginal,
            disabled: capturingPage || !canRestoreFocused,
            testID: 'document-preview-restore-page',
            accessibilityLabel: 'Restore original full-frame page',
          },
        ]
      : []),
    {
      key: 'clear',
      label: selectedPages.size > 0 ? 'Clear' : 'Select All',
      icon: (selectedPages.size > 0 ? 'close-outline' : 'checkbox-outline') as DocumentWorkspaceAction['icon'],
      onPress: toggleSelectAll,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="document-text" size={20} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle} numberOfLines={1}>
              {bookState.title || bookState.originalName}
            </Text>
            <Text style={styles.summaryMeta} numberOfLines={1}>
              Pages: {totalPages}
              {isCameraSession ? ' · Camera session' : ''}
              {bookState.originalName ? ` · ${bookState.originalName}` : ''}
            </Text>
          </View>
        </View>

        <DocumentAssessmentInlinePreview
          pageNumber={page}
          totalPages={totalPages}
          uri={previewUri}
          loading={loadingImages}
          colors={colors}
          onOpenFullscreen={openFullPreview}
          onPageChange={setPage}
          imageVersionKey={imageVersionKey}
        />

        <DocumentAssessmentActionBar
          hint={
            isCameraSession
              ? `Tap image or thumbnail for full-screen preview. Use ✓ to select and ✗ to remove (max ${MAX_IMAGE_UPLOADS}).`
              : `Tap image or thumbnail for full-screen preview; use ✓ to include pages (max ${MAX_QUIZ_PAGES}).`
          }
          selectionLabel={`Selected: ${selectedPages.size} / ${Math.min(MAX_QUIZ_PAGES, totalPages)} (max ${MAX_QUIZ_PAGES})`}
          actions={workspaceActions}
          colors={colors}
        />

        <DocumentAssessmentPageStrip
          pages={workspacePages}
          focusedPageNumber={page}
          selectedPageNumbers={selectedPages}
          colors={colors}
          canRemove={isCameraSession}
          onFocusPage={setPage}
          onToggleSelect={togglePageSelection}
          onRemove={isCameraSession ? handleRemoveCameraPage : undefined}
          onOpenFullscreen={openFullPreview}
        />

        <DocumentAssessmentGenerationSettings
          title={isCameraSession ? 'Step 2 · Generate Quiz' : 'Step 2 · Generate Quiz'}
          subtitle={
            isCameraSession
              ? 'Configure options, then generate — text is extracted from selected pages and a combined PDF is saved to the document library'
              : 'Configure options, then generate from selected pages'
          }
          difficulty={difficulty}
          questionCount={questionCount}
          onDifficultyChange={setDifficulty}
          onQuestionCountChange={setQuestionCount}
          colors={colors}
          disabled={loadingQuiz || loadingWorksheet}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryAction, (loadingQuiz || selectedPages.size === 0) && styles.disabled]}
          onPress={handleGenerateQuiz}
          disabled={loadingQuiz || selectedPages.size === 0}
        >
          {loadingQuiz ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="flash-outline" size={16} color="#fff" />
          )}
          <Text style={styles.primaryActionText}>
            {loadingQuiz ? processingStatus || 'Generating assessment…' : 'Generate Assessment'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.worksheetBtn, loadingWorksheet && styles.disabled]}
          onPress={handleGenerateWorksheet}
          disabled={loadingWorksheet}
        >
          {loadingWorksheet ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="document-text-outline" size={16} color={colors.primary} />
          )}
          <Text style={styles.worksheetBtnText}>
            {loadingWorksheet ? processingStatus || 'Generating worksheet…' : 'Generate Worksheet'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <FullScreenImagePreview
        visible={!!fullPreviewUri}
        uri={fullPreviewUri}
        title={`Page ${page}`}
        onClose={() => setFullPreviewUri(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 12, gap: 8, paddingBottom: 24 },

    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 10,
    },
    summaryIcon: {
      width: 38,
      height: 38,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FEE2E2',
    },
    summaryTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
    summaryMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

    toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pageNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    pageNavText: { color: colors.text, fontWeight: '700', fontSize: 13, minWidth: 92, textAlign: 'center' },
    navBtn: {
      width: 28,
      height: 28,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    navBtnDisabled: { opacity: 0.5 },
    zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    zoomText: { color: colors.text, fontWeight: '700', fontSize: 13, minWidth: 40, textAlign: 'center' },
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    previewWrap: {
      width: '100%',
      height: 320,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    previewScrollContent: {
      flexGrow: 1,
      minHeight: 318,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewPlaceholder: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
    },
    previewPlaceholderText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    thumbHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    selectionBar: {
      marginTop: 4,
      gap: 8,
    },
    selectionMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    selectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    compactActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    compactActionText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    selectAllBtn: {
      flexShrink: 0,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    selectAllText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    selectionCount: {
      flex: 1,
      flexShrink: 1,
      color: colors.textSecondary,
      fontSize: 12,
    },
    thumbRow: { gap: 8 },
    thumbItem: {
      width: 64,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 4,
      backgroundColor: colors.card,
      alignItems: 'center',
      position: 'relative',
    },
    thumbActive: { borderColor: '#38BDF8', backgroundColor: '#E0F2FE' },
    thumbSelected: { borderColor: '#0E7490', backgroundColor: '#ECFEFF' },
    selectCheck: {
      position: 'absolute',
      top: 2,
      left: 2,
      zIndex: 2,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 10,
    },
    removeThumbBtn: {
      position: 'absolute',
      top: 2,
      right: 2,
      zIndex: 2,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 10,
    },
    thumbImage: { width: 54, height: 58, borderRadius: 4, backgroundColor: colors.inputBackground },
    thumbPlaceholder: {
      width: 54,
      height: 58,
      borderRadius: 4,
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    thumbPlaceholderText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
    thumbText: { marginTop: 3, fontSize: 11, color: colors.textSecondary },
    thumbTextActive: { color: colors.primary, fontWeight: '700' },
    thumbTextSelected: { color: '#0E7490', fontWeight: '700' },

    generatorCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      padding: 12,
      gap: 8,
      marginTop: 4,
    },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    sectionSub: { color: colors.textSecondary, fontSize: 13 },
    label: { color: colors.text, fontWeight: '600', fontSize: 13, marginTop: 4 },
    metaInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground || colors.card,
    },
    pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    pillBtn: {
      minWidth: 72,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    pillBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    pillText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    pillTextActive: { color: '#fff' },

    primaryAction: {
      marginTop: 8,
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    worksheetBtn: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    worksheetBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    disabled: { opacity: 0.65 },

    errorBox: {
      borderWidth: 1,
      borderColor: '#FCA5A5',
      backgroundColor: '#FEF2F2',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorText: { color: '#B91C1C', fontSize: 12, flex: 1 },

    centerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, backgroundColor: colors.background },
    emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  });
