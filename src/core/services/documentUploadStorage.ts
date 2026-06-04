import AsyncStorage from '@react-native-async-storage/async-storage';
import { DocumentUploadBook } from './documentUploadApi';

const BOOKS_KEY = 'document_upload_module_books_v1';

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

export async function saveDocumentUploadBooks(items: DocumentUploadBook[]): Promise<void> {
  await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(items));
}

export async function upsertDocumentUploadBook(item: DocumentUploadBook): Promise<DocumentUploadBook[]> {
  const existing = await getDocumentUploadBooks();
  const next = [item, ...existing.filter((b) => b.id !== item.id)];
  await saveDocumentUploadBooks(next);
  return next;
}
