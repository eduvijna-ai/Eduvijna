/**
 * Library Management — web LibraryTab parity (Books + My Issues / Transactions).
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TeacherScreen,
  ScreenHeader,
  StudentModuleHeader,
  SurfaceCard,
  SegmentedControl,
  SearchBar,
  SelectField,
  FilterChips,
  ListItem,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
  type Segment,
  type ChipOption,
} from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { useLibraryData } from '../../hooks/useLibraryData';
import {
  BOOK_CATEGORIES,
  TX_STATUSES,
  TX_STATUS_COLORS,
  categoryLabel,
} from '../../utils/libraryMeta';

type Nav = NativeStackNavigationProp<{
  Library: undefined;
  CreateBook: { bookId?: number };
  CreateLibraryTransaction: { transactionId?: number };
}>;

export default function LibraryScreen() {
  const theme = useTeacherTheme();
  const navigation = useNavigation<Nav>();
  const lib = useLibraryData();
  const [tab, setTab] = useState('books');
  const [pulling, setPulling] = useState(false);

  const refreshAllRef = useRef(lib.refreshAll);
  refreshAllRef.current = lib.refreshAll;
  const refetchBooksRef = useRef(lib.refetchBooks);
  refetchBooksRef.current = lib.refetchBooks;
  const refetchTxRef = useRef(lib.refetchTransactions);
  refetchTxRef.current = lib.refetchTransactions;

  useFocusEffect(
    useCallback(() => {
      void refreshAllRef.current();
    }, []),
  );

  const onPullRefresh = useCallback(async () => {
    setPulling(true);
    try {
      if (tab === 'books') await refetchBooksRef.current();
      else await refetchTxRef.current();
    } finally {
      setPulling(false);
    }
  }, [tab]);

  const onHeaderRefresh = useCallback(() => {
    void onPullRefresh();
  }, [onPullRefresh]);

  const segments: Segment[] = useMemo(
    () => [
      {
        key: 'books',
        label: 'Books',
        icon: 'library-outline',
      },
      {
        key: 'transactions',
        label: lib.isStudent ? 'My Issues' : 'Transactions',
        icon: 'swap-horizontal-outline',
      },
    ],
    [lib.isStudent],
  );

  const categoryOptions = useMemo(
    () => [
      { label: 'All Categories', value: '' },
      ...BOOK_CATEGORIES.map((c) => ({
        label: categoryLabel(c),
        value: c,
      })),
    ],
    [],
  );

  const statusChips: ChipOption[] = useMemo(
    () => [
      { key: '', label: 'All' },
      ...TX_STATUSES.map((s) => ({ key: s, label: s })),
    ],
    [],
  );

  const onDeactivateBook = (bookId: number, title: string) => {
    Alert.alert('Deactivate?', `Deactivate “${title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await lib.deactivateBook(bookId);
            if (!ok) Alert.alert('Failed', lib.error || 'Could not deactivate book.');
          })();
        },
      },
    ]);
  };

  const onDeactivateTx = (txId: number) => {
    Alert.alert('Deactivate?', 'Deactivate this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await lib.deactivateTransaction(txId);
            if (!ok) {
              Alert.alert('Failed', lib.error || 'Could not deactivate transaction.');
            }
          })();
        },
      },
    ]);
  };

  const loading =
    (tab === 'books' && lib.bookLoading && lib.books.length === 0) ||
    (tab === 'transactions' && lib.txLoading && lib.transactions.length === 0);

  const header = lib.isStudent ? (
    <StudentModuleHeader
      title="Library"
      trailingIcon="refresh-outline"
      onTrailingPress={onHeaderRefresh}
      trailingAccessibilityLabel="Refresh library"
    />
  ) : (
    <ScreenHeader
      title="Library"
      showBack
      trailingIcon={lib.canManage ? 'add' : 'refresh-outline'}
      onTrailingPress={
        lib.canManage
          ? () =>
              navigation.navigate(
                tab === 'books' ? 'CreateBook' : 'CreateLibraryTransaction',
                {},
              )
          : onHeaderRefresh
      }
    />
  );

  if (loading) {
    return (
      <TeacherScreen header={header}>
        <ScreenLoader message="Loading library…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={header}
      contentStyle={styles.content}
      refreshing={pulling}
      onRefresh={() => void onPullRefresh()}
      footer={
        lib.canManage ? (
          <PrimaryButton
            label={tab === 'books' ? 'Add Book' : 'New Transaction'}
            icon="add-circle-outline"
            variant="gradient"
            onPress={() =>
              navigation.navigate(
                tab === 'books' ? 'CreateBook' : 'CreateLibraryTransaction',
                {},
              )
            }
          />
        ) : undefined
      }
    >
      <View style={styles.hero}>
        <View style={[styles.resourcePill, { backgroundColor: theme.colors.tintBlue }]}>
          <Text style={[styles.resourcePillText, { color: theme.colors.info }]}>
            Resource Center
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
          Library Management
        </Text>
        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
          {lib.isStudent
            ? 'Browse the book catalog and your issue history.'
            : 'Catalog books and track issue, return, and overdue transactions.'}
        </Text>
      </View>

      <SegmentedControl segments={segments} activeKey={tab} onChange={setTab} />

      {lib.error ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>{lib.error}</Text>
      ) : null}

      {tab === 'books' ? (
        <View style={styles.tabBody}>
          <Text style={[styles.tabHint, { color: theme.colors.textSecondary }]}>
            {lib.isStudent ? 'Browse available books.' : 'Manage catalog, copies, and shelf locations.'}
          </Text>

          <SearchBar
            value={lib.bookSearch}
            onChangeText={lib.setBookSearch}
            placeholder="Search books…"
          />
          <SelectField
            options={categoryOptions}
            value={lib.bookCategory}
            onChange={lib.setBookCategory}
            placeholder="All Categories"
          />

          <View style={styles.filterActions}>
            <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
              {lib.bookTotal} book{lib.bookTotal === 1 ? '' : 's'}
            </Text>
            <TouchableOpacity onPress={() => void lib.refetchBooks()} hitSlop={8}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
                ↻ Refresh
              </Text>
            </TouchableOpacity>
          </View>

          {lib.books.length === 0 ? (
            <EmptyState
              icon="library-outline"
              title="No books found"
              message="Try another search or category."
              ctaLabel={lib.canManage ? 'Add Book' : undefined}
              onCtaPress={
                lib.canManage ? () => navigation.navigate('CreateBook', {}) : undefined
              }
            />
          ) : (
            <SurfaceCard padded={false} style={styles.listCard}>
              {lib.books.map((book, index) => (
                <ListItem
                  key={book.id}
                  icon="book-outline"
                  iconAccent={book.availableCopies === 0 ? 'red' : 'teal'}
                  title={book.title}
                  subtitle={`#${book.bookId} · ${book.author || '—'} · ${categoryLabel(book.category)}`}
                  divider={index < lib.books.length - 1}
                  onPress={
                    lib.canManage
                      ? () =>
                          navigation.navigate('CreateBook', { bookId: book.bookId })
                      : undefined
                  }
                  trailing={
                    <View style={styles.trailing}>
                      <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                        Total {book.totalCopies}
                      </Text>
                      <Text
                        style={[
                          styles.meta,
                          {
                            color:
                              book.issuedCopies > 0
                                ? '#0e7490'
                                : theme.colors.textSecondary,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        Issued {book.issuedCopies}
                      </Text>
                      <Text
                        style={[
                          styles.meta,
                          {
                            color:
                              book.availableCopies === 0
                                ? theme.colors.danger
                                : theme.colors.success,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        Available {book.availableCopies}
                      </Text>
                      {lib.canManage ? (
                        <View style={styles.actions}>
                          <TouchableOpacity
                            onPress={() =>
                              navigation.navigate('CreateBook', {
                                bookId: book.bookId,
                              })
                            }
                            hitSlop={8}
                          >
                            <Text
                              style={{
                                color: theme.colors.info,
                                fontSize: 12,
                                fontWeight: '700',
                              }}
                            >
                              Edit
                            </Text>
                          </TouchableOpacity>
                          {book.isActive ? (
                            <TouchableOpacity
                              onPress={() =>
                                onDeactivateBook(book.bookId, book.title)
                              }
                              hitSlop={8}
                            >
                              <Text
                                style={{
                                  color: theme.colors.danger,
                                  fontSize: 12,
                                  fontWeight: '700',
                                }}
                              >
                                Deactivate
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  }
                />
              ))}
            </SurfaceCard>
          )}

          {lib.bookPages > 1 ? (
            <View style={styles.pager}>
              <TouchableOpacity
                disabled={lib.bookPage <= 1}
                onPress={() => lib.setBookPage(Math.max(1, lib.bookPage - 1))}
              >
                <Text
                  style={{
                    color:
                      lib.bookPage <= 1
                        ? theme.colors.textSecondary
                        : theme.colors.primary,
                    fontWeight: '700',
                  }}
                >
                  Previous
                </Text>
              </TouchableOpacity>
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
                {lib.bookPage} / {lib.bookPages} ({lib.bookTotal} total)
              </Text>
              <TouchableOpacity
                disabled={lib.bookPage >= lib.bookPages}
                onPress={() =>
                  lib.setBookPage(Math.min(lib.bookPages, lib.bookPage + 1))
                }
              >
                <Text
                  style={{
                    color:
                      lib.bookPage >= lib.bookPages
                        ? theme.colors.textSecondary
                        : theme.colors.primary,
                    fontWeight: '700',
                  }}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.tabBody}>
          <Text style={[styles.tabHint, { color: theme.colors.textSecondary }]}>
            {lib.isStudent
              ? 'Your borrowed books and due dates.'
              : 'Issue, return, and fine tracking.'}
          </Text>

          <FilterChips
            size="sm"
            options={statusChips}
            activeKey={lib.txStatusFilter}
            onChange={(k) => lib.setTxStatusFilter(k)}
          />

          <View style={styles.filterActions}>
            <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
              {lib.txTotal}{' '}
              {lib.isStudent
                ? `issue${lib.txTotal === 1 ? '' : 's'}`
                : `transaction${lib.txTotal === 1 ? '' : 's'}`}
            </Text>
            <TouchableOpacity onPress={() => void lib.refetchTransactions()} hitSlop={8}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
                ↻ Refresh
              </Text>
            </TouchableOpacity>
          </View>

          {!lib.academicYearId && lib.canManage ? (
            <Text style={[styles.hint, { color: theme.colors.danger }]}>
              Select an academic year to load students for new issues.
            </Text>
          ) : null}

          {lib.transactions.length === 0 ? (
            <EmptyState
              icon="swap-horizontal-outline"
              title={lib.isStudent ? 'No issues found' : 'No transactions'}
              message={
                lib.isStudent
                  ? 'You have no borrowed books for this filter.'
                  : 'Issue a book to see it here.'
              }
              ctaLabel={lib.canManage ? 'New Transaction' : undefined}
              onCtaPress={
                lib.canManage
                  ? () => navigation.navigate('CreateLibraryTransaction', {})
                  : undefined
              }
            />
          ) : (
            <SurfaceCard padded={false} style={styles.listCard}>
              {lib.transactions.map((tx, index) => {
                const colors = TX_STATUS_COLORS[tx.status] || TX_STATUS_COLORS.issued;
                return (
                  <ListItem
                    key={tx.id}
                    icon="bookmark-outline"
                    iconAccent={
                      tx.status === 'overdue'
                        ? 'red'
                        : tx.status === 'returned'
                          ? 'green'
                          : 'blue'
                    }
                    title={lib.bookLabel(tx.bookId)}
                    subtitle={
                      lib.isStudent
                        ? `Issue ${tx.issueDate || '—'} · Due ${tx.dueDate || '—'}`
                        : `${lib.memberLabel(tx.memberId, tx.memberType)} · ${tx.memberType}`
                    }
                    divider={index < lib.transactions.length - 1}
                    onPress={
                      lib.canManage
                        ? () =>
                            navigation.navigate('CreateLibraryTransaction', {
                              transactionId: tx.transactionId,
                            })
                        : undefined
                    }
                    trailing={
                      <View style={styles.trailing}>
                        <View
                          style={[styles.statusPill, { backgroundColor: colors.bg }]}
                        >
                          <Text style={[styles.statusText, { color: colors.fg }]}>
                            {tx.status}
                          </Text>
                        </View>
                        {!lib.isStudent ? (
                          <>
                            <Text
                              style={[styles.meta, { color: theme.colors.textSecondary }]}
                            >
                              Issue {tx.issueDate || '—'}
                            </Text>
                            <Text
                              style={[styles.meta, { color: theme.colors.textSecondary }]}
                            >
                              Due {tx.dueDate || '—'}
                            </Text>
                          </>
                        ) : (
                          <Text
                            style={[styles.meta, { color: theme.colors.textSecondary }]}
                          >
                            #{tx.transactionId}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.meta,
                            {
                              color:
                                tx.fineAmount > 0
                                  ? theme.colors.danger
                                  : theme.colors.textSecondary,
                              fontWeight: tx.fineAmount > 0 ? '700' : '600',
                            },
                          ]}
                        >
                          {tx.fineAmount > 0 ? `Fine ₹${tx.fineAmount}` : 'No fine'}
                        </Text>
                        {lib.canManage ? (
                          <View style={styles.actions}>
                            <TouchableOpacity
                              onPress={() =>
                                navigation.navigate('CreateLibraryTransaction', {
                                  transactionId: tx.transactionId,
                                })
                              }
                              hitSlop={8}
                            >
                              <Text
                                style={{
                                  color: theme.colors.info,
                                  fontSize: 12,
                                  fontWeight: '700',
                                }}
                              >
                                Edit
                              </Text>
                            </TouchableOpacity>
                            {tx.isActive ? (
                              <TouchableOpacity
                                onPress={() => onDeactivateTx(tx.transactionId)}
                                hitSlop={8}
                              >
                                <Text
                                  style={{
                                    color: theme.colors.danger,
                                    fontSize: 12,
                                    fontWeight: '700',
                                  }}
                                >
                                  Deactivate
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    }
                  />
                );
              })}
            </SurfaceCard>
          )}

          {lib.txPages > 1 ? (
            <View style={styles.pager}>
              <TouchableOpacity
                disabled={lib.txPage <= 1}
                onPress={() => lib.setTxPage(Math.max(1, lib.txPage - 1))}
              >
                <Text
                  style={{
                    color:
                      lib.txPage <= 1
                        ? theme.colors.textSecondary
                        : theme.colors.primary,
                    fontWeight: '700',
                  }}
                >
                  Previous
                </Text>
              </TouchableOpacity>
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
                {lib.txPage} / {lib.txPages} ({lib.txTotal} total)
              </Text>
              <TouchableOpacity
                disabled={lib.txPage >= lib.txPages}
                onPress={() => lib.setTxPage(Math.min(lib.txPages, lib.txPage + 1))}
              >
                <Text
                  style={{
                    color:
                      lib.txPage >= lib.txPages
                        ? theme.colors.textSecondary
                        : theme.colors.primary,
                    fontWeight: '700',
                  }}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  hero: { gap: 4 },
  resourcePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 2,
  },
  resourcePillText: { fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroSub: { fontSize: 13, lineHeight: 18 },
  tabHint: { fontSize: 12, fontWeight: '500' },
  tabBody: { gap: 10 },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: { fontSize: 12, fontWeight: '600' },
  error: { fontSize: 13 },
  hint: { fontSize: 12 },
  listCard: { paddingHorizontal: 14 },
  trailing: { alignItems: 'flex-end', gap: 3, maxWidth: 140 },
  meta: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
