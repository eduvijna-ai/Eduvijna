import AsyncStorage from '@react-native-async-storage/async-storage';
import { DocumentUploadBook } from './documentUploadApi';

const BOOKS_KEY = 'document_upload_module_books_v1';
const RESET_HOME_KEY = 'document_upload_home_reset_v1';

export async function getDocumentUploadBooks(): Promise<DocumentUploadBook[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch {
    return [];
  }
}

/** Latest locally cached book by id. Camera add/remove persist here — screens must re-read this, not keep an in-memory copy. */
export async function getDocumentUploadBookById(id: string): Promise<DocumentUploadBook | null> {
  if (!id) return null;
  const books = await getDocumentUploadBooks();
  return books.find((b) => b.id === id) ?? null;
}

export async function saveDocumentUploadBooks(items: DocumentUploadBook[]): Promise<void> {
  await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(items));
}

export async function upsertDocumentUploadBook(item: DocumentUploadBook): Promise<DocumentUploadBook[]> {
  const existing = await getDocumentUploadBooks();
  const next = [item, ...existing.filter((b) => b.id !== item.id)];
  await saveDocumentUploadBooks(next);
  return next;
}

/** Remove a locally cached upload book (e.g. after assessment is generated). */
export async function removeDocumentUploadBook(id: string): Promise<DocumentUploadBook[]> {
  const existing = await getDocumentUploadBooks();
  const next = existing.filter((b) => b.id !== id);
  await saveDocumentUploadBooks(next);
  return next;
}

/**
 * Called when the teacher closes the quiz (X), not when they generate.
 * Generate must keep the local session so Back / New can still edit pages.
 */
export async function markDocumentUploadSessionComplete(bookId: string): Promise<void> {
  if (!bookId) return;
  await removeDocumentUploadBook(bookId);
  await AsyncStorage.setItem(RESET_HOME_KEY, bookId);
}

/** Returns the book id to reset, or null if no pending reset. Consumes the flag. */
export async function consumeDocumentUploadHomeReset(): Promise<string | null> {
  const id = await AsyncStorage.getItem(RESET_HOME_KEY);
  if (!id) return null;
  await AsyncStorage.removeItem(RESET_HOME_KEY);
  return id;
}
