/**
 * Create / Edit Book — web LibraryTab Add Book modal parity.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  PrimaryButton,
  ScreenLoader,
} from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { useLibraryData } from '../../hooks/useLibraryData';
import { BOOK_CATEGORIES, categoryLabel } from '../../utils/libraryMeta';

type Params = { CreateBook: { bookId?: number } };
type Nav = NativeStackNavigationProp<Params>;

const CATEGORY_OPTIONS = BOOK_CATEGORIES.map((c) => ({
  label: categoryLabel(c),
  value: c,
}));

export default function CreateBookScreen() {
  const theme = useTeacherTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<Params, 'CreateBook'>>();
  const { createBook, updateBook, getBook, saving, canManage } = useLibraryData();

  const editingId = route.params?.bookId;
  const isEdit = editingId != null && editingId > 0;

  useEffect(() => {
    if (!canManage) {
      Alert.alert('Library', 'Students can browse books but cannot add or edit them.');
      navigation.goBack();
    }
  }, [canManage, navigation]);

  if (!canManage) {
    return (
      <TeacherScreen header={<ScreenHeader title="Book" showBack />}>
        <ScreenLoader message="Returning…" />
      </TeacherScreen>
    );
  }

  const [loading, setLoading] = useState(Boolean(isEdit));
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [category, setCategory] = useState('general');
  const [totalCopies, setTotalCopies] = useState('1');
  const [availableCopies, setAvailableCopies] = useState('1');
  const [shelf, setShelf] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isEdit || !editingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const book = await getBook(editingId);
      if (cancelled) return;
      if (book) {
        setTitle(book.title);
        setAuthor(book.author);
        setIsbn(book.isbn);
        setPublisher(book.publisher);
        setCategory(book.category || 'general');
        setTotalCopies(String(book.totalCopies));
        setAvailableCopies(String(book.availableCopies));
        setShelf(book.shelfLocation);
        setDescription(book.description);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editingId, getBook]);

  const onTotalChange = (text: string) => {
    setTotalCopies(text);
    if (!isEdit) setAvailableCopies(text || '1');
  };

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Title is required.');
      return;
    }
    const payload = {
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      publisher: publisher.trim(),
      category,
      total_copies: Number(totalCopies) || 1,
      shelf_location: shelf.trim(),
      description: description.trim() || null,
    };
    const ok = isEdit
      ? await updateBook(editingId!, payload)
      : await createBook(payload);
    if (!ok) {
      Alert.alert('Save failed', 'Could not save book. Please try again.');
      return;
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title={isEdit ? 'Edit Book' : 'Add Book'} />}>
        <ScreenLoader message="Loading book…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={isEdit ? 'Edit Book' : 'Add Book'} />}
      contentStyle={styles.content}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save'}
            icon="checkmark-outline"
            disabled={saving}
            onPress={() => void onSave()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Title" required>
            <TextField value={title} onChangeText={setTitle} placeholder="Book title" />
          </FormField>
          <FormField label="Author">
            <TextField value={author} onChangeText={setAuthor} placeholder="Author" />
          </FormField>
          <FormField label="ISBN">
            <TextField value={isbn} onChangeText={setIsbn} placeholder="ISBN" />
          </FormField>
          <FormField label="Publisher">
            <TextField
              value={publisher}
              onChangeText={setPublisher}
              placeholder="Publisher"
            />
          </FormField>
          <FormField label="Category">
            <SelectField
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
            />
          </FormField>
          <FormField label="Total Copies">
            <TextField
              value={totalCopies}
              onChangeText={onTotalChange}
              keyboardType="number-pad"
              placeholder="1"
            />
          </FormField>
          <FormField
            label="Available Copies"
            hint="Available is calculated as Total minus active issued/overdue/lost transactions."
          >
            <TextField
              value={availableCopies}
              editable={false}
              placeholder="0"
            />
          </FormField>
          <FormField label="Shelf Location">
            <TextField
              value={shelf}
              onChangeText={setShelf}
              placeholder="Shelf / rack"
            />
          </FormField>
          <FormField label="Description">
            <TextField
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description…"
              multiline
            />
          </FormField>
          <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
            Available copies are managed by the server after issue/return.
          </Text>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  form: { gap: 4 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
