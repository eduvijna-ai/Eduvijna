/**
 * DocumentLibraryScreen
 * Mobile equivalent of the web HandwrittenWorkspace "Book Search" panel.
 *
 * Server-backed library of uploaded books (study materials) so documents are
 * shared across devices/web rather than living only in local AsyncStorage.
 *   - Search + grade/subject filter chips
 *   - Upload a book with full metadata (title, grade, subject, lesson)
 *   - Delete a book
 *   - Tap a book to open BookPageViewerScreen (select pages -> generate)
 *
 * Role-gated: only instructors / admins manage the shared library.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import {
  listServerBooks,
  getBookFilters,
  deleteServerBook,
  uploadBookWithMetadata,
  fetchBookPageImage,
  DOCUMENT_FILE_MIME_TYPES,
  type ServerBook,
  type BookFilterOptions,
} from '@core/services/documentUploadApi';

/** Lazily-loaded page-1 cover thumbnail for a library book. */
function BookCover({ docId, fallbackColor, iconBg }: { docId: string; fallbackColor: string; iconBg: string }) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetchBookPageImage(docId, 1, 'mini').then((u) => {
      if (active && u) setUri(u);
    });
    return () => {
      active = false;
    };
  }, [docId]);

  if (uri) {
    return <Image source={{ uri }} style={coverStyles.cover} resizeMode="cover" />;
  }
  return (
    <View style={[coverStyles.cover, { backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="book-outline" size={22} color={fallbackColor} />
    </View>
  );
}

const coverStyles = StyleSheet.create({
  cover: { width: 44, height: 56, borderRadius: 8, backgroundColor: '#E2E8F0' },
});

const normalizeErrorMessage = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') return detail.message;
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
};

const canManageLibrary = (role?: string): boolean =>
  role === 'instructor' || role === 'admin' || role === 'super_admin';

export default function DocumentLibraryScreen({ navigation }: any) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const allowed = canManageLibrary(user?.role);

  const [books, setBooks] = useState<ServerBook[]>([]);
  const [filters, setFilters] = useState<BookFilterOptions>({
    grade_levels: [],
    subjects: [],
    lessons: [],
    sub_lessons: [],
  });
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload modal state
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [uTitle, setUTitle] = useState('');
  const [uGrade, setUGrade] = useState('');
  const [uSubject, setUSubject] = useState('');
  const [uLesson, setULesson] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchBooks = useCallback(async () => {
    setError('');
    try {
      const list = await listServerBooks(search);
      setBooks(list);
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to load the document library.'));
      setBooks([]);
    }
  }, [search]);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([listServerBooks(''), getBookFilters()])
      .then(([list, f]) => {
        if (!active) return;
        setBooks(list);
        setFilters(f);
      })
      .catch((e) => {
        if (!active) return;
        setError(normalizeErrorMessage(e, 'Failed to load the document library.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBooks();
    setRefreshing(false);
  }, [fetchBooks]);

  const handleSearchSubmit = useCallback(async () => {
    setLoading(true);
    await fetchBooks();
    setLoading(false);
  }, [fetchBooks]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (gradeFilter !== 'all' && b.gradeLevel !== gradeFilter) return false;
      if (subjectFilter !== 'all' && b.subject !== subjectFilter) return false;
      return true;
    });
  }, [books, gradeFilter, subjectFilter]);

  const handleDelete = useCallback((book: ServerBook) => {
    Alert.alert('Delete Book', `Remove "${book.title}" from the library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(book.docId);
          try {
            await deleteServerBook(book.docId);
            setBooks((prev) => prev.filter((b) => b.docId !== book.docId));
          } catch (e: any) {
            Alert.alert('Error', normalizeErrorMessage(e, 'Failed to delete the book.'));
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }, []);

  const openBook = useCallback(
    (book: ServerBook) => {
      navigation.navigate('BookPageViewerScreen', { book });
    },
    [navigation],
  );

  const pickUploadFile = async () => {
    try {
      setUploadError('');
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: [...DOCUMENT_FILE_MIME_TYPES],
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploadFile({ uri: asset.uri, name: asset.name || `document-${Date.now()}`, mimeType: asset.mimeType });
      if (!uTitle.trim()) setUTitle((asset.name || '').replace(/\.[^/.]+$/, ''));
    } catch (e: any) {
      setUploadError(normalizeErrorMessage(e, 'Failed to pick a file.'));
    }
  };

  const submitUpload = async () => {
    if (!uploadFile) {
      setUploadError('Please choose a PDF or Word document (1 file).');
      return;
    }
    if (!uTitle.trim()) {
      setUploadError('Book name is required.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const created = await uploadBookWithMetadata({
        fileUri: uploadFile.uri,
        fileName: uploadFile.name,
        mimeType: uploadFile.mimeType,
        title: uTitle.trim(),
        gradeLevel: uGrade.trim(),
        subject: uSubject.trim(),
        lessonTitle: uLesson.trim(),
      });
      setBooks((prev) => [created, ...prev]);
      // Reset and close
      setUploadVisible(false);
      setUploadFile(null);
      setUTitle('');
      setUGrade('');
      setUSubject('');
      setULesson('');
    } catch (e: any) {
      setUploadError(normalizeErrorMessage(e, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  if (!allowed) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '14' }]}>
          <Ionicons name="lock-closed-outline" size={30} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Library Unavailable</Text>
        <Text style={styles.emptyText}>The document library is available to teachers and admins.</Text>
      </View>
    );
  }

  const gradeChips = ['all', ...filters.grade_levels];
  const subjectChips = ['all', ...filters.subjects];

  const renderBook = ({ item }: { item: ServerBook }) => (
    <TouchableOpacity style={styles.bookCard} onPress={() => openBook(item)} activeOpacity={0.85}>
      <BookCover docId={item.docId} fallbackColor={colors.primary} iconBg={colors.primary + '15'} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.bookMetaRow}>
          {!!item.subject && <Text style={styles.bookMeta}>{item.subject}</Text>}
          {!!item.gradeLevel && <Text style={styles.bookMeta}>· {item.gradeLevel}</Text>}
          <Text style={styles.bookMeta}>· {item.totalPages || 0} pages</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        disabled={deletingId === item.docId}
      >
        {deletingId === item.docId ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Ionicons name="trash-outline" size={18} color={colors.error || '#DC2626'} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); }}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filters */}
      {(gradeChips.length > 1 || subjectChips.length > 1) && (
        <View style={styles.filterBlock}>
          {gradeChips.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {gradeChips.map((g) => (
                <TouchableOpacity
                  key={`g-${g}`}
                  style={[styles.chip, gradeFilter === g && styles.chipActive]}
                  onPress={() => setGradeFilter(g)}
                >
                  <Text style={[styles.chipText, gradeFilter === g && styles.chipTextActive]}>
                    {g === 'all' ? 'All Grades' : g}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {subjectChips.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {subjectChips.map((s) => (
                <TouchableOpacity
                  key={`s-${s}`}
                  style={[styles.chip, subjectFilter === s && styles.chipActive]}
                  onPress={() => setSubjectFilter(s)}
                >
                  <Text style={[styles.chipText, subjectFilter === s && styles.chipTextActive]}>
                    {s === 'all' ? 'All Subjects' : s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading library...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>Couldn't load library</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleSearchSubmit}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="library-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No documents yet</Text>
          <Text style={styles.emptyText}>Upload your first book to generate assessments from it.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setUploadVisible(true)}>
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Upload Book</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(i) => i.docId}
          renderItem={renderBook}
          contentContainerStyle={{ padding: 14, paddingBottom: 96 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Upload FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(20, insets.bottom + 12) }]}
        onPress={() => setUploadVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={uploadVisible} transparent animationType="slide" onRequestClose={() => setUploadVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Book</Text>
              <TouchableOpacity onPress={() => setUploadVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.filePicker} onPress={pickUploadFile} activeOpacity={0.8}>
                <Ionicons
                  name={uploadFile ? 'document-text' : 'cloud-upload-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.filePickerText} numberOfLines={1}>
                  {uploadFile ? uploadFile.name : 'Choose PDF or image'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Book Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={uTitle}
                onChangeText={setUTitle}
                placeholder="e.g. Physics Chapter 3"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Grade / Class</Text>
              <TextInput
                style={styles.modalInput}
                value={uGrade}
                onChangeText={setUGrade}
                placeholder="e.g. Class 10"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.modalInput}
                value={uSubject}
                onChangeText={setUSubject}
                placeholder="e.g. Physics"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Lesson</Text>
              <TextInput
                style={styles.modalInput}
                value={uLesson}
                onChangeText={setULesson}
                placeholder="e.g. Optics"
                placeholderTextColor={colors.textSecondary}
              />

              {!!uploadError && <Text style={styles.modalError}>{uploadError}</Text>}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmit, (uploading || !uploadFile) && styles.disabledBtn]}
              onPress={submitUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Upload to Library</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
    loadingText: { marginTop: 10, color: colors.textSecondary, fontSize: 13 },

    searchWrap: { padding: 12, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.inputBackground || colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      paddingVertical: 0,
      margin: 0,
      height: '100%',
      textAlignVertical: 'center',
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
    },

    filterBlock: { backgroundColor: colors.card, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 6 },
    chipRow: { paddingHorizontal: 12, gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    chipTextActive: { color: '#fff' },

    bookCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 12,
    },
    bookIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    bookTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    bookMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
    bookMeta: { fontSize: 12, color: colors.textSecondary },
    deleteBtn: { padding: 6 },

    emptyIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 16,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
    },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 24,
      maxHeight: '88%',
    },
    modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: colors.border, marginBottom: 14 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    filePicker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
    },
    filePickerText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 5 },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 14,
      marginBottom: 12,
    },
    modalError: { color: colors.error || '#DC2626', fontSize: 13, marginBottom: 8 },
    modalSubmit: {
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    disabledBtn: { opacity: 0.6 },
  });
