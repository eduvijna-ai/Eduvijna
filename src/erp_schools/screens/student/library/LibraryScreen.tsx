/**
 * Library — search, categories, recommendations, issued books and e-books.
 * Reference: assets/student_screens/student library screen.png
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentIdentityHeader,
  SearchBar,
  SurfaceCard,
  SectionHeader,
  PrimaryButton,
  AcademicYearPill,
} from '../../../components';
import { accentColors } from '../../../theme/accents';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentData } from '../../../hooks/useStudentData';
import { useStudentUIStore } from '../../../store/studentUI.store';
import type { LibraryBook } from '../../../types/student';

const QUICK = [
  { key: 'browse', label: 'Browse Books', icon: 'book-outline', accent: 'blue' as const },
  { key: 'ebooks', label: 'e-Books', icon: 'tablet-portrait-outline', accent: 'green' as const },
  { key: 'issued', label: 'My Issued Books', icon: 'bookmark-outline', accent: 'purple' as const },
  { key: 'due', label: 'Due Soon', icon: 'time-outline', accent: 'orange' as const },
  { key: 'history', label: 'Reading History', icon: 'refresh-outline', accent: 'red' as const },
];

function BookCover({ book }: { book: LibraryBook }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.bookCol}>
      <View style={[styles.cover, { backgroundColor: book.coverColor }]}>
        <Text style={styles.coverTitle} numberOfLines={3}>{book.title}</Text>
        {book.isEbook ? (
          <View style={styles.ebookTag}><Text style={styles.ebookTagText}>e-Book</Text></View>
        ) : null}
      </View>
      <Text style={[styles.bookTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{book.title}</Text>
      <Text style={[styles.bookAuthor, { color: theme.colors.textSecondary }]} numberOfLines={1}>{book.author}</Text>
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={11} color={theme.colors.warning} />
        <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>{book.rating}</Text>
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const theme = useTeacherTheme();
  const { profile, library, academicYears } = useStudentData();
  const academicYear = useStudentUIStore((s) => s.academicYear);
  const setAcademicYear = useStudentUIStore((s) => s.setAcademicYear);
  const [query, setQuery] = useState('');

  return (
    <TeacherScreen
      header={
        <StudentIdentityHeader
          title="Library"
          studentName={profile.name}
          className={profile.className}
          rollNo={profile.rollNo}
          admissionNo={profile.admissionNo}
          rightSlot={<AcademicYearPill value={academicYear} options={academicYears} onChange={setAcademicYear} />}
        />
      }
      contentStyle={styles.content}
    >
      <View style={styles.searchRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by book title, author or subject…" />
        <TouchableOpacity style={[styles.filterBtn, { borderColor: theme.colors.border }]} accessibilityRole="button" accessibilityLabel="Filter">
          <Ionicons name="options-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {QUICK.map((q) => {
            const accent = accentColors(theme.colors, q.accent);
            return (
              <TouchableOpacity key={q.key} style={styles.quickItem} accessibilityRole="button" accessibilityLabel={q.label}>
                <View style={[styles.quickIcon, { backgroundColor: accent.bg }]}>
                  <Ionicons name={q.icon as keyof typeof Ionicons.glyphMap} size={20} color={accent.fg} />
                </View>
                <Text style={[styles.quickLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>{q.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Categories" />
        <View style={styles.categoryGrid}>
          {library.categories.map((cat) => {
            const accent = accentColors(theme.colors, cat.accent);
            return (
              <SurfaceCard key={cat.id} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: accent.bg }]}>
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={18} color={accent.fg} />
                </View>
                <Text style={[styles.categoryLabel, { color: theme.colors.textPrimary }]}>{cat.label}</Text>
                <Text style={[styles.categoryCount, { color: theme.colors.textSecondary }]}>{cat.count} Books</Text>
              </SurfaceCard>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recommended for You" actionLabel="View All" onAction={() => undefined} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.booksRow}>
          {library.recommended.map((book) => <BookCover key={book.id} book={book} />)}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Currently Issued" actionLabel="View All" onAction={() => undefined} />
        {library.issued.map((book) => (
          <SurfaceCard key={book.id} style={[styles.issuedCard, { backgroundColor: theme.colors.tintGreen }]}>
            <View style={styles.issuedRow}>
              <View style={[styles.issuedCover, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="book" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.issuedInfo}>
                <Text style={[styles.issuedTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{book.title}</Text>
                <Text style={[styles.issuedAuthor, { color: theme.colors.textSecondary }]}>{book.author}</Text>
                <View style={styles.issuedMeta}>
                  <Text style={[styles.issuedDate, { color: theme.colors.textSecondary }]}>Issued {book.issuedOn}</Text>
                  <Text style={[styles.issuedDue, { color: theme.colors.danger }]}>Due {book.dueOn} ({book.daysLeft} days left)</Text>
                </View>
              </View>
            </View>
            <PrimaryButton label="Renew Book" variant="outline" onPress={() => undefined} style={styles.renewBtn} />
          </SurfaceCard>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title="e-Books Collection" actionLabel="View All" onAction={() => undefined} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.booksRow}>
          {library.ebooks.map((book) => <BookCover key={book.id} book={book} />)}
        </ScrollView>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterBtn: { width: 46, height: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 0 },
  quickRow: { gap: 16, paddingRight: 16 },
  quickItem: { width: 64, alignItems: 'center', gap: 6 },
  quickIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  categoryCard: { width: '23%', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 4 },
  categoryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  categoryCount: { fontSize: 10 },
  booksRow: { gap: 14, paddingRight: 16 },
  bookCol: { width: 96, gap: 3 },
  cover: { width: 96, height: 130, borderRadius: 10, padding: 10, justifyContent: 'flex-start' },
  coverTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  ebookTag: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ebookTagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  bookTitle: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  bookAuthor: { fontSize: 11 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 11, fontWeight: '600' },
  issuedCard: { gap: 12 },
  issuedRow: { flexDirection: 'row', gap: 12 },
  issuedCover: { width: 44, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  issuedInfo: { flex: 1, gap: 2 },
  issuedTitle: { fontSize: 14, fontWeight: '700' },
  issuedAuthor: { fontSize: 12 },
  issuedMeta: { gap: 2, marginTop: 4 },
  issuedDate: { fontSize: 11 },
  issuedDue: { fontSize: 11, fontWeight: '600' },
  renewBtn: { height: 40 },
});
