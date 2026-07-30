/**
 * Library Dashboard — LIVE KPIs + recent activity (web Library tab / admin overview parity).
 * Deep-links into shared Library Management (Books + Transactions).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SectionHeader,
  StatGrid,
  ListItem,
  ScreenLoader,
  EmptyState,
  PrimaryButton,
  type StatItem,
} from '../../../components';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useSchoolsSession } from '../../../hooks/useSchoolsSession';
import { booksApi, libraryTransactionsApi } from '@core/api/erp.api';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../../../utils/apiHelpers';
import { TX_STATUS_COLORS } from '../../../utils/libraryMeta';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';

type RecentTx = {
  id: number;
  bookId: number;
  bookLabel: string;
  memberId: number;
  memberType: string;
  status: string;
  issueDate: string;
  dueDate: string;
  fineAmount: number;
};

export default function LibraryDashboardScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const { schoolId } = useSchoolsSession();

  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [booksCount, setBooksCount] = useState(0);
  const [issued, setIssued] = useState(0);
  const [available, setAvailable] = useState(0);
  const [overdue, setOverdue] = useState(0);
  const [recent, setRecent] = useState<RecentTx[]>([]);

  const loadRef = useRef<() => Promise<void>>(async () => undefined);

  const load = useCallback(async () => {
    if (!schoolId) {
      setStatus('error');
      setError('School not found.');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const schoolParams = { school_id: schoolId, per_page: 200 as const };
      const [booksRaw, txsRaw] = await Promise.all([
        booksApi.list(schoolParams),
        libraryTransactionsApi.list(schoolParams),
      ]);
      const books = safeList<Record<string, unknown>>(booksRaw);
      const txs = safeList<Record<string, unknown>>(txsRaw);

      const titleById = new Map<number, string>();
      let totalCopies = 0;
      let availableCopies = 0;
      for (const b of books) {
        const id = pickNumber(b.id);
        const title = pickString(b.title, `Book #${id}`);
        const author = pickString(b.author);
        if (id) titleById.set(id, author ? `${title} — ${author}` : title);
        totalCopies += pickNumber(b.total_copies, 0);
        availableCopies += pickNumber(b.available_copies, 0);
      }

      const issuedTx = txs.filter((t) => {
        const s = pickString(t.status).toLowerCase();
        return s === 'issued' || s === 'active';
      });
      const overdueTx = txs.filter(
        (t) => pickString(t.status).toLowerCase() === 'overdue',
      );

      setBooksCount(totalCopies || books.length);
      setIssued(issuedTx.length);
      setAvailable(availableCopies);
      setOverdue(overdueTx.length);

      const sorted = [...txs].sort((a, b) => {
        const da = pickString(a.issue_date) || pickString(a.created_at);
        const db = pickString(b.issue_date) || pickString(b.created_at);
        return db.localeCompare(da);
      });

      setRecent(
        sorted.slice(0, 8).map((t) => {
          const bookId = pickNumber(t.book_id);
          return {
            id: pickNumber(t.id),
            bookId,
            bookLabel: titleById.get(bookId) || (bookId ? `#${bookId}` : '—'),
            memberId: pickNumber(t.member_id),
            memberType: pickString(t.member_type, 'student') || 'student',
            status: pickString(t.status, 'issued') || 'issued',
            issueDate: pickString(t.issue_date).slice(0, 10),
            dueDate: pickString(t.due_date).slice(0, 10),
            fineAmount: pickNumber(t.fine_amount),
          };
        }),
      );
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
  }, [schoolId]);

  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      void loadRef.current();
    }, []),
  );

  const kpis: StatItem[] = useMemo(
    () => [
      {
        key: 'books',
        icon: 'library-outline',
        value: String(booksCount),
        label: 'Total Books',
        accent: 'teal',
      },
      {
        key: 'issued',
        icon: 'bookmark-outline',
        value: String(issued),
        label: 'Issued',
        accent: 'blue',
      },
      {
        key: 'available',
        icon: 'checkmark-circle-outline',
        value: String(available),
        label: 'Available',
        accent: 'green',
      },
      {
        key: 'overdue',
        icon: 'alert-circle-outline',
        value: String(overdue),
        label: 'Overdue',
        accent: 'orange',
      },
    ],
    [booksCount, issued, available, overdue],
  );

  if (status === 'idle' || status === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title="Library" showBack />}>
        <ScreenLoader message="Loading library…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Library"
          showBack
          trailingIcon="refresh-outline"
          onTrailingPress={() => void load()}
        />
      }
      contentStyle={styles.content}
      footer={
        <PrimaryButton
          label="Open Library Management"
          icon="library-outline"
          variant="gradient"
          onPress={() => navigation.navigate('Library')}
        />
      }
    >
      {error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text>
      ) : null}

      <StatGrid items={kpis} columns={2} variant="tinted" />

      <SectionHeader title="Quick Actions" />
      <SurfaceCard padded={false} style={styles.card}>
        <ListItem
          icon="book-outline"
          iconAccent="teal"
          title="Books Catalog"
          subtitle="Search, categories, add / edit / deactivate"
          showChevron
          onPress={() => navigation.navigate('Library')}
        />
        <ListItem
          icon="swap-horizontal-outline"
          iconAccent="blue"
          title="Transactions"
          subtitle="Issue, return, overdue & fines"
          showChevron
          onPress={() => navigation.navigate('Library')}
        />
        <ListItem
          icon="add-circle-outline"
          iconAccent="green"
          title="Add Book"
          subtitle="Create a new catalog entry"
          showChevron
          onPress={() => navigation.navigate('CreateBook', {})}
        />
        <ListItem
          icon="create-outline"
          iconAccent="purple"
          title="New Transaction"
          subtitle="Issue a book to student or staff"
          divider={false}
          showChevron
          onPress={() => navigation.navigate('CreateLibraryTransaction', {})}
        />
      </SurfaceCard>

      <SectionHeader
        title="Recent Activity"
        actionLabel="View All"
        onAction={() => navigation.navigate('Library')}
      />
      {recent.length === 0 ? (
        <EmptyState
          icon="swap-horizontal-outline"
          title="No transactions yet"
          message="Issue a book to see activity here."
          ctaLabel="New Transaction"
          onCtaPress={() => navigation.navigate('CreateLibraryTransaction', {})}
        />
      ) : (
        <SurfaceCard padded={false} style={styles.card}>
          {recent.map((tx, index) => {
            const colors = TX_STATUS_COLORS[tx.status] || TX_STATUS_COLORS.issued;
            return (
              <ListItem
                key={tx.id || index}
                icon="bookmark-outline"
                iconAccent={
                  tx.status === 'overdue'
                    ? 'red'
                    : tx.status === 'returned'
                      ? 'green'
                      : 'blue'
                }
                title={tx.bookLabel}
                subtitle={`${tx.memberType} #${tx.memberId} · Issue ${tx.issueDate || '—'} · Due ${tx.dueDate || '—'}`}
                divider={index < recent.length - 1}
                onPress={() =>
                  navigation.navigate('CreateLibraryTransaction', {
                    transactionId: tx.id,
                  })
                }
                trailing={
                  <View style={styles.trailing}>
                    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.pillText, { color: colors.fg }]}>
                        {tx.status}
                      </Text>
                    </View>
                    {tx.fineAmount > 0 ? (
                      <Text style={{ color: theme.colors.danger, fontSize: 11, fontWeight: '700' }}>
                        ₹{tx.fineAmount}
                      </Text>
                    ) : null}
                  </View>
                }
              />
            );
          })}
        </SurfaceCard>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  card: { paddingHorizontal: 14 },
  trailing: { alignItems: 'flex-end', gap: 4 },
  pill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});
