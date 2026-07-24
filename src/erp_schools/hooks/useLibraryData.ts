/**
 * useLibraryData — web LibraryTab parity (books + transactions CRUD).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  booksApi,
  libraryTransactionsApi,
  staffProfilesApi,
  studentsByUserApi,
} from '@core/api/erp.api';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';
import { useAcademicYear } from '../contexts/AcademicYearContext';

export type LibraryBook = {
  id: string;
  bookId: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  shelfLocation: string;
  description: string;
  isActive: boolean;
};

export type LibraryTx = {
  id: string;
  transactionId: number;
  bookId: number;
  memberId: number;
  memberType: string;
  status: string;
  issueDate: string;
  dueDate: string;
  returnDate: string;
  fineAmount: number;
  remarks: string;
  isActive: boolean;
};

export type MemberOption = { id: number; label: string };

export type BookFormPayload = {
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  category?: string;
  total_copies?: number;
  shelf_location?: string;
  description?: string | null;
};

export type TxFormPayload = {
  book_id: number;
  member_id: number;
  member_type: string;
  status: string;
  issue_date?: string;
  due_date?: string;
  return_date?: string | null;
  fine_amount?: number;
  remarks?: string | null;
};

function mapBook(raw: Record<string, unknown>, i: number): LibraryBook {
  const bookId = pickNumber(raw.id, i + 1);
  const total = pickNumber(raw.total_copies, 0);
  const available = pickNumber(raw.available_copies, 0);
  return {
    id: String(bookId || `b-${i}`),
    bookId,
    title: pickString(raw.title, 'Untitled'),
    author: pickString(raw.author),
    isbn: pickString(raw.isbn),
    publisher: pickString(raw.publisher),
    category: pickString(raw.category, 'general') || 'general',
    totalCopies: total,
    availableCopies: available,
    issuedCopies: Math.max(0, total - available),
    shelfLocation: pickString(raw.shelf_location),
    description: pickString(raw.description),
    isActive: raw.is_active !== false,
  };
}

function mapTx(raw: Record<string, unknown>, i: number): LibraryTx {
  const transactionId = pickNumber(raw.id, i + 1);
  return {
    id: String(transactionId || `tx-${i}`),
    transactionId,
    bookId: pickNumber(raw.book_id),
    memberId: pickNumber(raw.member_id),
    memberType: pickString(raw.member_type, 'student') || 'student',
    status: pickString(raw.status, 'issued') || 'issued',
    issueDate: pickString(raw.issue_date).slice(0, 10),
    dueDate: pickString(raw.due_date).slice(0, 10),
    returnDate: pickString(raw.return_date).slice(0, 10),
    fineAmount: pickNumber(raw.fine_amount),
    remarks: pickString(raw.remarks),
    isActive: raw.is_active !== false,
  };
}

function unwrapRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      return obj.data as Record<string, unknown>;
    }
    return obj;
  }
  return {};
}

export function useLibraryData() {
  const { schoolId, isStudent } = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const canManage = !isStudent;

  const [bookStatus, setBookStatus] = useState<LoadStatus>('idle');
  const [txStatus, setTxStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [bookTotal, setBookTotal] = useState(0);
  const [bookPage, setBookPage] = useState(1);
  const [bookSearch, setBookSearch] = useState('');
  const [bookCategory, setBookCategory] = useState('');

  const [transactions, setTransactions] = useState<LibraryTx[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txStatusFilter, setTxStatusFilterState] = useState('');

  const [catalogBooks, setCatalogBooks] = useState<LibraryBook[]>([]);
  const [staffMembers, setStaffMembers] = useState<MemberOption[]>([]);
  const [studentMembers, setStudentMembers] = useState<MemberOption[]>([]);

  const perPage = 25;

  const loadBooks = useCallback(async () => {
    setBookStatus('loading');
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = {
        page: bookPage,
        per_page: perPage,
      };
      if (schoolId) params.school_id = schoolId;
      if (bookSearch.trim()) params.q = bookSearch.trim();
      if (bookCategory) params.category = bookCategory;
      const data = await booksApi.list(params);
      const items = safeList<Record<string, unknown>>(data).map(mapBook);
      const total =
        data && typeof data === 'object' && 'total' in (data as object)
          ? pickNumber((data as Record<string, unknown>).total, items.length)
          : items.length;
      setBooks(items);
      setBookTotal(total);
      setBookStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setBooks([]);
      setBookTotal(0);
      setBookStatus('error');
    }
  }, [schoolId, bookPage, bookSearch, bookCategory]);

  const loadTransactions = useCallback(async () => {
    setTxStatus('loading');
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: txPage,
        per_page: perPage,
      };
      if (schoolId) params.school_id = schoolId;
      if (txStatusFilter) params.status = txStatusFilter;
      const data = await libraryTransactionsApi.list(params);
      const items = safeList<Record<string, unknown>>(data).map(mapTx);
      const total =
        data && typeof data === 'object' && 'total' in (data as object)
          ? pickNumber((data as Record<string, unknown>).total, items.length)
          : items.length;
      setTransactions(items);
      setTxTotal(total);
      setTxStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setTransactions([]);
      setTxTotal(0);
      setTxStatus('error');
    }
  }, [schoolId, txPage, txStatusFilter]);

  const loadCatalogBooks = useCallback(async () => {
    if (!schoolId) {
      setCatalogBooks([]);
      return;
    }
    try {
      const data = await booksApi.list({ per_page: 200, school_id: schoolId });
      setCatalogBooks(safeList<Record<string, unknown>>(data).map(mapBook));
    } catch {
      setCatalogBooks([]);
    }
  }, [schoolId]);

  const loadMembers = useCallback(async () => {
    if (!schoolId) {
      setStaffMembers([]);
      setStudentMembers([]);
      return;
    }
    try {
      const staffRaw = await staffProfilesApi.list({
        per_page: 200,
        school_id: schoolId,
      });
      setStaffMembers(
        safeList<Record<string, unknown>>(staffRaw).map((s, i) => {
          const id = pickNumber(s.id, i + 1);
          const name = [pickString(s.first_name), pickString(s.last_name)]
            .filter(Boolean)
            .join(' ');
          const desig = pickString(s.designation);
          return {
            id,
            label: `${name || `Staff #${id}`}${desig ? ` — ${desig}` : ''}`,
          };
        }),
      );
    } catch {
      setStaffMembers([]);
    }

    if (!selectedYearId) {
      setStudentMembers([]);
      return;
    }
    try {
      const studentsRaw = await studentsByUserApi.getAll({
        academic_year_id: selectedYearId,
      });
      const seen = new Set<number>();
      const opts: MemberOption[] = [];
      for (const s of safeList<Record<string, unknown>>(studentsRaw)) {
        const profileId = pickNumber(s.profile_id);
        if (!profileId || seen.has(profileId)) continue;
        seen.add(profileId);
        const name = pickString(s.name, 'Student');
        const adm = pickString(s.admission_number);
        const cls = [pickString(s.class_name), pickString(s.section_name)]
          .filter(Boolean)
          .join(' ');
        opts.push({
          id: profileId,
          label: `${name}${adm ? ` (${adm})` : ''}${cls ? ` — ${cls}` : ''}`,
        });
      }
      setStudentMembers(opts);
    } catch {
      setStudentMembers([]);
    }
  }, [schoolId, selectedYearId]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    void loadCatalogBooks();
    void loadMembers();
  }, [loadCatalogBooks, loadMembers]);

  const bookLabel = useCallback(
    (bookId: number) => {
      const b =
        catalogBooks.find((x) => x.bookId === bookId) ||
        books.find((x) => x.bookId === bookId);
      return b
        ? `${b.title}${b.author ? ` — ${b.author}` : ''}`
        : bookId
          ? `#${bookId}`
          : '—';
    },
    [catalogBooks, books],
  );

  const memberLabel = useCallback(
    (memberId: number, memberType: string) => {
      const list = memberType === 'staff' ? staffMembers : studentMembers;
      const m = list.find((x) => x.id === memberId);
      return m?.label || `#${memberId}`;
    },
    [staffMembers, studentMembers],
  );

  const getBook = useCallback(
    async (bookId: number): Promise<LibraryBook | null> => {
      const cached =
        books.find((b) => b.bookId === bookId) ||
        catalogBooks.find((b) => b.bookId === bookId);
      if (cached) return cached;
      try {
        const raw = unwrapRecord(await booksApi.get(bookId, schoolId ?? undefined));
        return mapBook(raw, 0);
      } catch {
        return null;
      }
    },
    [books, catalogBooks, schoolId],
  );

  const getTransaction = useCallback(
    async (txId: number): Promise<LibraryTx | null> => {
      const cached = transactions.find((t) => t.transactionId === txId);
      if (cached) return cached;
      try {
        const raw = unwrapRecord(
          await libraryTransactionsApi.get(txId, schoolId ?? undefined),
        );
        return mapTx(raw, 0);
      } catch {
        return null;
      }
    },
    [transactions, schoolId],
  );

  const createBook = useCallback(
    async (payload: BookFormPayload) => {
      if (!schoolId) {
        setError('School not found.');
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        const total = Number(payload.total_copies ?? 1);
        await booksApi.create({
          school_id: schoolId,
          title: payload.title.trim(),
          author: payload.author?.trim() || null,
          isbn: payload.isbn?.trim() || null,
          publisher: payload.publisher?.trim() || null,
          category: payload.category || 'general',
          total_copies: total,
          available_copies: total,
          shelf_location: payload.shelf_location?.trim() || null,
          description: payload.description?.trim() || null,
        });
        setBookPage(1);
        await loadBooks();
        await loadCatalogBooks();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadBooks, loadCatalogBooks],
  );

  const updateBook = useCallback(
    async (bookId: number, payload: BookFormPayload) => {
      setSaving(true);
      setError(null);
      try {
        await booksApi.update(
          bookId,
          {
            title: payload.title.trim(),
            author: payload.author?.trim() || null,
            isbn: payload.isbn?.trim() || null,
            publisher: payload.publisher?.trim() || null,
            category: payload.category || 'general',
            total_copies: Number(payload.total_copies ?? 1),
            shelf_location: payload.shelf_location?.trim() || null,
            description: payload.description?.trim() || null,
          },
          schoolId ?? undefined,
        );
        await loadBooks();
        await loadCatalogBooks();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadBooks, loadCatalogBooks],
  );

  const deactivateBook = useCallback(
    async (bookId: number) => {
      setSaving(true);
      setError(null);
      try {
        await booksApi.softDelete(bookId, schoolId ?? undefined);
        await loadBooks();
        await loadCatalogBooks();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadBooks, loadCatalogBooks],
  );

  const createTransaction = useCallback(
    async (payload: TxFormPayload) => {
      if (!schoolId) {
        setError('School not found.');
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        await libraryTransactionsApi.create({
          school_id: schoolId,
          book_id: payload.book_id,
          member_id: payload.member_id,
          member_type: payload.member_type || 'student',
          status: payload.status || 'issued',
          issue_date: payload.issue_date || toLocalDateStr(),
          due_date: payload.due_date || undefined,
          return_date: payload.return_date || null,
          fine_amount: payload.fine_amount ?? 0,
          remarks: payload.remarks?.trim() || null,
        });
        setTxPage(1);
        await loadTransactions();
        await loadBooks();
        await loadCatalogBooks();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadTransactions, loadBooks, loadCatalogBooks],
  );

  const updateTransaction = useCallback(
    async (txId: number, payload: TxFormPayload) => {
      setSaving(true);
      setError(null);
      try {
        await libraryTransactionsApi.update(
          txId,
          {
            due_date: payload.due_date || undefined,
            return_date: payload.return_date || undefined,
            fine_amount:
              payload.fine_amount != null ? Number(payload.fine_amount) : undefined,
            status: payload.status,
            remarks: payload.remarks?.trim() || null,
          },
          schoolId ?? undefined,
        );
        await loadTransactions();
        await loadBooks();
        await loadCatalogBooks();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadTransactions, loadBooks, loadCatalogBooks],
  );

  const deactivateTransaction = useCallback(
    async (txId: number) => {
      setSaving(true);
      setError(null);
      try {
        await libraryTransactionsApi.softDelete(txId, schoolId ?? undefined);
        await loadTransactions();
        await loadBooks();
        await loadCatalogBooks();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadTransactions, loadBooks, loadCatalogBooks],
  );

  const bookPages = Math.max(1, Math.ceil(bookTotal / perPage));
  const txPages = Math.max(1, Math.ceil(txTotal / perPage));

  const refreshAll = useCallback(async () => {
    await Promise.all([loadBooks(), loadTransactions(), loadCatalogBooks()]);
  }, [loadBooks, loadTransactions, loadCatalogBooks]);

  return useMemo(
    () => ({
      canManage,
      isStudent,
      academicYearId: selectedYearId,
      error,
      saving,
      // books
      books,
      bookTotal,
      bookPage,
      bookPages,
      setBookPage,
      bookSearch,
      setBookSearch: (q: string) => {
        setBookSearch(q);
        setBookPage(1);
      },
      bookCategory,
      setBookCategory: (c: string) => {
        setBookCategory(c);
        setBookPage(1);
      },
      bookStatus,
      bookLoading: bookStatus === 'loading' || bookStatus === 'idle',
      refetchBooks: loadBooks,
      // transactions
      transactions,
      txTotal,
      txPage,
      txPages,
      setTxPage,
      txStatusFilter,
      setTxStatusFilter: (s: string) => {
        setTxStatusFilterState((prev) => (prev === s ? '' : s));
        setTxPage(1);
      },
      txStatus,
      txLoading: txStatus === 'loading' || txStatus === 'idle',
      refetchTransactions: loadTransactions,
      // lookups
      catalogBooks,
      staffMembers,
      studentMembers,
      bookLabel,
      memberLabel,
      getBook,
      getTransaction,
      createBook,
      updateBook,
      deactivateBook,
      createTransaction,
      updateTransaction,
      deactivateTransaction,
      refreshAll,
    }),
    [
      canManage,
      isStudent,
      selectedYearId,
      error,
      saving,
      books,
      bookTotal,
      bookPage,
      bookPages,
      bookSearch,
      bookCategory,
      bookStatus,
      loadBooks,
      transactions,
      txTotal,
      txPage,
      txPages,
      txStatusFilter,
      txStatus,
      loadTransactions,
      catalogBooks,
      staffMembers,
      studentMembers,
      bookLabel,
      memberLabel,
      getBook,
      getTransaction,
      createBook,
      updateBook,
      deactivateBook,
      createTransaction,
      updateTransaction,
      deactivateTransaction,
      refreshAll,
    ],
  );
}
