import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDocumentScreenFocusEffect } from '@core/hooks/useDocumentScreenFocusEffect';
import {
  readDocumentWorkspacePreset,
  withDocumentWorkspaceParams,
  workspacePresetToPreviewFields,
} from '@core/utils/documentWorkspaceParams';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { useQuizNavAccessRedirect } from '@core/hooks/useQuizNavAccessRedirect';
import {
  DocumentUploadBook,
  fetchBookPageImage,
  isPdfAsset,
  uploadBookWithMetadata,
  uploadDocumentToRag,
  resolveBookPageCount,
  resolveServerBook,
  createCameraSessionBook,
  appendCameraPage,
  mergeCameraSessionPages,
  sanitizeCameraDocumentTitle,
  MAX_QUIZ_PAGES,
  MAX_IMAGE_UPLOADS,
  DOCUMENT_FILE_MIME_TYPES,
} from '@core/services/documentUploadApi';
import { compressCameraImage } from '@core/services/documentImageUtils';
import { captureDocumentImage } from '@core/services/documentCameraCapture';
import {
  getDocumentUploadBooks,
  getDocumentUploadBookById,
  upsertDocumentUploadBook,
  consumeDocumentUploadHomeReset,
} from '@core/services/documentUploadStorage';
import { resolvePickerAssetBlob } from '@core/utils/documentUploadPickerAsset';
import { rememberDocumentUploadFile } from '@core/services/documentUploadSessionFiles';
import DocumentCurriculumFromBooksScreen from './DocumentCurriculumFromBooksScreen';

const FALLBACK_THUMB = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800';

type ActiveTab = 'upload' | 'fromBooks';

const normalizeErrorMessage = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message.trim()) {
      const extra = Array.isArray(detail.details)
        ? detail.details.join(', ')
        : typeof detail.details === 'string'
          ? detail.details
          : '';
      return extra ? `${detail.message} (${extra})` : detail.message;
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
};

export default function DocumentUploadHomeScreen({ navigation, route }: any) {
  useQuizNavAccessRedirect('DocumentUploadHomeScreen', navigation);
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const scrollBottomPad = Math.max(insets.bottom + 28, Platform.OS === 'android' ? 48 : 28);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  const [books, setBooks] = useState<DocumentUploadBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<DocumentUploadBook | null>(null);
  const selectedBookRef = useRef<DocumentUploadBook | null>(null);
  selectedBookRef.current = selectedBook;
  const [bookName, setBookName] = useState('');
  const [search, setSearch] = useState('');
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBooks = useCallback(async () => {
    setLoadingBooks(true);
    const loaded = await getDocumentUploadBooks();
    setBooks(loaded);
    setLoadingBooks(false);
  }, []);

  // Reload on focus; clear upload UI after a successful assessment generation.
  // selectedBook is in-memory — Preview add/remove persist to AsyncStorage, so
  // re-read that copy here or Home keeps showing the stale page count.
  useDocumentScreenFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingBooks(true);
      (async () => {
        const pendingReset = await consumeDocumentUploadHomeReset();
        const loaded = await getDocumentUploadBooks();
        if (!active) return;
        setBooks(loaded);
        const current = selectedBookRef.current;
        // Only wipe Home when Close deleted THIS selected book. Generate no longer
        // sets the reset flag, so Back → add pages → Home keeps the session.
        const closedSelected =
          !!pendingReset && !!current && current.id === pendingReset && !loaded.some((b) => b.id === pendingReset);

        if (closedSelected) {
          setSelectedBook(null);
          setBookName('');
          setError('');
          setSuccess('');
          setActiveTab('upload');
        } else if (current) {
          const updated = loaded.find((b) => b.id === current.id) ?? null;
          setSelectedBook(updated);
          if (!updated) {
            setBookName('');
          } else {
            setBookName((name) => {
              if (!name || name === current.title || name === current.originalName) {
                return updated.title || updated.originalName;
              }
              return name;
            });
          }
        }
        setLoadingBooks(false);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    const autoAction = route?.params?.autoAction as 'upload' | 'camera' | 'gallery' | 'search' | undefined;
    if (!autoAction) return;

    if (autoAction === 'upload') {
      void handleUploadTilePress();
    } else if (autoAction === 'camera') {
      void handleCameraTilePress();
    } else if (autoAction === 'gallery') {
      void handleGalleryTilePress();
    } else if (autoAction === 'search') {
      setActiveTab('upload');
      setLibraryPickerOpen(true);
    }

    // Clear one-time action so it won't rerun on focus re-entry.
    navigation.setParams?.({ autoAction: undefined });
  }, [route?.params?.autoAction]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return books;
    return books.filter((book) => {
      return (
        book.title?.toLowerCase().includes(q) ||
        book.originalName?.toLowerCase().includes(q)
      );
    });
  }, [books, search]);

  const pickAndUpload = async () => {
    try {
      setError('');
      setSuccess('');

      // One document file only (PDF/DOC/…). Images use Gallery / Camera (up to 5).
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: [...DOCUMENT_FILE_MIME_TYPES],
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0] as {
        uri: string;
        name?: string;
        mimeType?: string;
        size?: number;
        file?: File | Blob;
      };
      const file = await resolvePickerAssetBlob(asset);
      await processAssetAndNavigate({ ...asset, file });
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to upload document.'));
    } finally {
      setUploading(false);
    }
  };

  const processCameraCapture = async (asset: {
    uri: string;
    name?: string;
    mimeType?: string;
    size?: number;
  }) => {
    setError('');
    // URI is already EXIF-normalized + aspect-preserving compressed (full frame).
    const fileUri = asset.uri;
    const fileName = asset.name || `camera-${Date.now()}.jpg`;
    const page = {
      pageNumber: 1,
      fileUri,
      fileName,
      mimeType: asset.mimeType || 'image/jpeg',
      thumbnailUri: fileUri,
    };

    const title = sanitizeCameraDocumentTitle(bookName || fileName);
    let next: DocumentUploadBook;

    if (selectedBook?.isCameraSession && (selectedBook.pages?.length || 0) < MAX_QUIZ_PAGES) {
      next = appendCameraPage(selectedBook, page);
      next = { ...next, title: title || next.title };
    } else {
      next = createCameraSessionBook(page, title);
    }

    if ((next.pages?.length || 0) > MAX_QUIZ_PAGES) {
      setError(`You can capture up to ${MAX_QUIZ_PAGES} pages.`);
      return;
    }

    await upsertDocumentUploadBook(next);
    setSelectedBook(next);
    setBookName(next.title);
    await loadBooks();
    navigation.navigate(
      'DocumentUploadPreviewScreen',
      withDocumentWorkspaceParams(route, {
        book: next,
        ...workspacePresetToPreviewFields(readDocumentWorkspacePreset(route)),
      }),
    );
  };

  const processAssetAndNavigate = async (asset: {
    uri: string;
    name?: string;
    mimeType?: string;
    size?: number;
    file?: File | Blob;
  }) => {
    const fileName = asset.name || `document-${Date.now()}`;
    const mimeType = asset.mimeType || 'application/octet-stream';
    const title = (bookName || fileName.replace(/\.[^/.]+$/, '') || 'Uploaded Book').trim();
    const now = new Date().toISOString();

    // Web parity (HandwrittenWorkspace instant upload): PDFs go through study-materials/books/upload
    // so total_pages and page images use the same doc_id as the document library.
    let next: DocumentUploadBook;

    if (isPdfAsset(fileName, mimeType)) {
      const uploaded = await uploadBookWithMetadata({
        fileUri: asset.uri,
        fileName,
        mimeType,
        file: asset.file,
        title,
        lessonTitle: title,
      });

      let thumbnailUri: string | undefined;
      if (uploaded.docId) {
        const serverBook = await resolveServerBook(uploaded.docId, fileName);
        const alternateIds = serverBook?.docId && serverBook.docId !== uploaded.docId
          ? [serverBook.docId]
          : [];
        thumbnailUri =
          (await fetchBookPageImage(uploaded.docId, 1, 'mini', alternateIds)) ?? undefined;
      }

      next = {
        id: uploaded.docId || `${Date.now()}`,
        title,
        originalName: fileName,
        uploadedFileName: uploaded.filename || fileName,
        docId: uploaded.docId,
        totalPages: uploaded.totalPages,
        fileSize: asset.size,
        fileUri: asset.uri,
        mimeType,
        thumbnailUri,
        createdAt: now,
      };
    } else {
      const rag = await uploadDocumentToRag({
        fileUri: asset.uri,
        fileName,
        mimeType,
        file: asset.file,
        forceOcr: false,
      });

      let totalPages = Math.max(1, rag.totalPages || 1);
      if (rag.docId) {
        const resolved = await resolveBookPageCount(rag.docId, fileName);
        if (resolved && resolved > 0) totalPages = resolved;
      }

      next = {
        id: String(rag.docId || `${Date.now()}`),
        title,
        originalName: fileName,
        uploadedFileName: rag.uploadedFileName,
        docId: rag.docId,
        totalPages,
        fileSize: asset.size || rag.fileSize,
        fileUri: asset.uri,
        mimeType,
        thumbnailUri: mimeType.startsWith('image/') ? asset.uri : undefined,
        createdAt: now,
      };
    }

    if (asset.file) {
      rememberDocumentUploadFile(next.id, asset.file);
    }
    await upsertDocumentUploadBook(next);
    setSelectedBook(next);
    setBookName(next.title);
    await loadBooks();

    // Required flow: upload/capture success -> direct preview
    navigation.navigate(
      'DocumentUploadPreviewScreen',
      withDocumentWorkspaceParams(route, {
        book: next,
        ...workspacePresetToPreviewFields(readDocumentWorkspacePreset(route)),
      }),
    );
  };

  const handleUploadTilePress = async () => {
    setUploading(true);
    await pickAndUpload();
  };

  const handleGalleryTilePress = async () => {
    try {
      setError('');
      setSuccess('');
      setCapturing(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Photo library permission is required to pick images.');
        return;
      }

      const existingCount =
        selectedBook?.isCameraSession ? selectedBook.pages?.length || 0 : 0;
      const remaining = MAX_IMAGE_UPLOADS - existingCount;
      if (remaining <= 0) {
        setError(`You can upload up to ${MAX_IMAGE_UPLOADS} images.`);
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
        const compressedUri = await compressCameraImage(asset.uri);
        pages.push({
          pageNumber: i + 1,
          fileUri: compressedUri,
          fileName: asset.fileName || `gallery-${Date.now()}-${i}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          thumbnailUri: compressedUri,
        });
      }

      const title = sanitizeCameraDocumentTitle(bookName || 'Gallery Document');
      const next = mergeCameraSessionPages(
        selectedBook?.isCameraSession ? selectedBook : null,
        pages,
        title,
      );

      if ((next.pages?.length || 0) > MAX_IMAGE_UPLOADS) {
        setError(`You can upload up to ${MAX_IMAGE_UPLOADS} images.`);
        return;
      }

      await upsertDocumentUploadBook(next);
      setSelectedBook(next);
      setBookName(next.title);
      await loadBooks();
      navigation.navigate(
      'DocumentUploadPreviewScreen',
      withDocumentWorkspaceParams(route, {
        book: next,
        ...workspacePresetToPreviewFields(readDocumentWorkspacePreset(route)),
      }),
    );
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to pick images from gallery.'));
    } finally {
      setCapturing(false);
    }
  };

  const handleCameraTilePress = async () => {
    try {
      setError('');
      setSuccess('');
      setCapturing(true);

      const captured = await captureDocumentImage();
      if (!captured) return;

      await processCameraCapture({
        uri: captured.uri,
        name: captured.name,
        mimeType: captured.mimeType,
        size: captured.fileSize,
      });
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to capture document.'));
    } finally {
      setCapturing(false);
    }
  };

  const goToPreview = async () => {
    if (!selectedBook) {
      setError('Please upload or select a book first.');
      return;
    }

    const stored = await getDocumentUploadBookById(selectedBook.id);
    if (!stored) {
      setSelectedBook(null);
      setBookName('');
      setError('That document is no longer available. Please upload or capture again.');
      return;
    }

    const mergedBook = {
      ...stored,
      title: (bookName || stored.title || stored.originalName).trim(),
    };
    await upsertDocumentUploadBook(mergedBook);
    setSelectedBook(mergedBook);

    navigation.navigate(
      'DocumentUploadPreviewScreen',
      withDocumentWorkspaceParams(route, {
        book: mergedBook,
        ...workspacePresetToPreviewFields(readDocumentWorkspacePreset(route)),
      }),
    );
  };

  const goToHistory = () => {
    navigation.navigate('DocumentUploadHistoryScreen');
  };

  const renderBookPreview = () => {
    if (!selectedBook) {
      return (
        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No uploaded books yet</Text>
          <Text style={styles.emptyText}>Upload a document to start the new Document Upload flow.</Text>
          <TouchableOpacity style={styles.changeBtn} onPress={() => setLibraryPickerOpen(true)}>
            <Ionicons name="folder-open-outline" size={16} color={colors.primary} />
            <Text style={styles.changeBtnText}>Browse uploaded library</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.bookCard}>
        <View style={styles.bookCardHeader}>
          <Text style={styles.bookCardTitle}>Search Uploaded Book</Text>
          <TouchableOpacity onPress={goToHistory}>
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroRow}>
          <Image
            source={{ uri: selectedBook.thumbnailUri || FALLBACK_THUMB }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroMeta}>
            <Text style={styles.heroName} numberOfLines={2}>{selectedBook.title || selectedBook.originalName}</Text>
            <View style={styles.pageBadge}>
              <Ionicons name="documents-outline" size={13} color={colors.primary} />
              <Text style={styles.pageBadgeText}>{selectedBook.totalPages || 1} pages</Text>
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={() => setLibraryPickerOpen(true)}>
              <Ionicons name="refresh-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.changeBtnText}>Change book</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.previewHint}>Tap “Continue to Pages” below to choose pages and generate.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabRow}>
        {([
          { key: 'upload', label: 'From Upload' },
          { key: 'fromBooks', label: 'From Books' },
        ] as const).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'fromBooks' ? (
        <DocumentCurriculumFromBooksScreen navigation={navigation} embedded />
      ) : (
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]}>
        {loadingBooks ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading books...</Text>
          </View>
        ) : (
          renderBookPreview()
        )}

        {libraryPickerOpen && (
          <View style={styles.searchCard}>
            <View style={styles.bookCardHeader}>
              <Text style={styles.bookCardTitle}>Uploaded library</Text>
              <TouchableOpacity onPress={() => setLibraryPickerOpen(false)}>
                <Text style={styles.linkText}>Close</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search uploaded books"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
            {filteredBooks.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptyText}>No matching books found.</Text>
              </View>
            ) : (
              filteredBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.searchItem, selectedBook?.id === book.id && styles.searchItemActive]}
                  onPress={() => {
                    setSelectedBook(book);
                    setBookName(book.title || book.originalName);
                    setLibraryPickerOpen(false);
                  }}
                >
                  <Ionicons name="book-outline" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchItemTitle}>{book.title || book.originalName}</Text>
                    <Text style={styles.searchItemMeta}>{book.totalPages} pages</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {!!selectedBook && (
          <View>
            <Text style={styles.label}>Book Name</Text>
            <TextInput
              value={bookName}
              onChangeText={setBookName}
              placeholder="Enter book name"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
          </View>
        )}

        {!!success && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.sourceTile, (uploading || capturing) && styles.disabledBtn]}
            onPress={handleUploadTilePress}
            disabled={uploading || capturing}
          >
            {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="document-attach-outline" size={18} color={colors.primary} />}
            <Text style={styles.sourceTileText}>{uploading ? 'Opening...' : 'Upload File'}</Text>
            <Text style={styles.sourceTileHint}>1 PDF / DOC</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceTile, (uploading || capturing) && styles.disabledBtn]}
            onPress={handleGalleryTilePress}
            disabled={uploading || capturing}
          >
            {capturing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="images-outline" size={18} color={colors.primary} />}
            <Text style={styles.sourceTileText}>Gallery</Text>
            <Text style={styles.sourceTileHint}>
              Up to {MAX_IMAGE_UPLOADS} images · saved to library on generate
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.sourceTile, (uploading || capturing) && styles.disabledBtn]}
            onPress={() => navigation.navigate('DocumentLibraryScreen')}
            disabled={uploading || capturing}
          >
            <Ionicons name="library-outline" size={18} color={colors.primary} />
            <Text style={styles.sourceTileText}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceTile, (uploading || capturing) && styles.disabledBtn]}
            onPress={handleCameraTilePress}
            disabled={uploading || capturing}
          >
            {capturing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="camera-outline" size={18} color={colors.primary} />}
            <Text style={styles.sourceTileText}>{capturing ? 'Opening...' : 'Camera'}</Text>
            <Text style={styles.sourceTileHint}>
              Up to {MAX_IMAGE_UPLOADS} photos · saved to library on generate
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, (uploading || capturing) && styles.disabledBtn]}
            onPress={goToHistory}
            disabled={uploading || capturing}
          >
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={styles.secondaryBtnText}>View History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, !selectedBook && styles.disabledBtn]}
            onPress={goToPreview}
            disabled={!selectedBook}
          >
            <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Continue to Pages</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnActive: { borderBottomColor: colors.primary },
    tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    tabTextActive: { color: colors.primary },
    content: { padding: 14, gap: 14 },
    loadingWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
    loadingText: { color: colors.textSecondary, fontSize: 12 },

    libraryBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary + '40',
      borderRadius: 14,
      padding: 14,
    },
    libraryBannerIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '15',
    },
    libraryBannerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    libraryBannerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

    bookCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.card,
      padding: 12,
      gap: 10,
    },
    bookCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bookCardTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    linkText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
    heroRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    heroImage: { width: 96, height: 110, borderRadius: 10, backgroundColor: colors.inputBackground },
    heroMeta: { flex: 1, gap: 8 },
    heroName: { fontSize: 15, fontWeight: '700', color: colors.text },
    pageBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      backgroundColor: colors.primary + '14',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pageBadgeText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
    previewHint: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
    pageText: { fontSize: 15, fontWeight: '700', color: colors.text },
    changeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.background,
    },
    changeBtnText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
    thumbRow: { gap: 8 },
    thumbItem: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 4,
      alignItems: 'center',
      backgroundColor: colors.card,
      width: 60,
    },
    thumbItemActive: { borderColor: '#38BDF8', backgroundColor: '#E0F2FE' },
    thumbImage: { width: 50, height: 56, borderRadius: 4, backgroundColor: colors.inputBackground },
    thumbLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    thumbLabelActive: { color: colors.primary, fontWeight: '700' },

    searchCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.card,
      padding: 12,
      gap: 10,
    },
    searchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      backgroundColor: colors.background,
    },
    searchItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
    searchItemTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
    searchItemMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

    emptyCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.card,
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    emptySmall: { alignItems: 'center', paddingVertical: 20 },
    emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    emptyText: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },

    label: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.card,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },

    successBox: {
      borderWidth: 1,
      borderColor: '#86EFAC',
      backgroundColor: '#F0FDF4',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    successText: { color: '#15803D', fontSize: 13, fontWeight: '600' },
    errorBox: {
      borderWidth: 1,
      borderColor: '#FCA5A5',
      backgroundColor: '#FEF2F2',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorText: { color: '#B91C1C', fontSize: 12, flex: 1 },

    actionRow: { flexDirection: 'row', gap: 10 },
    sourceTile: {
      flex: 1,
      minHeight: 82,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 6,
    },
    sourceTileText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 11,
      textAlign: 'center',
    },
    sourceTileHint: {
      color: colors.textSecondary,
      fontSize: 10,
      textAlign: 'center',
      marginTop: -4,
    },
    secondaryBtn: {
      flex: 1,
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryBtnText: { color: colors.primary, fontWeight: '700' },
    primaryBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
    disabledBtn: { opacity: 0.7 },
  });
