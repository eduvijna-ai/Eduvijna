import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDocumentUploadBooks,
  upsertDocumentUploadBook,
  consumeDocumentUploadHomeReset,
  markDocumentUploadSessionComplete,
} from '../core/services/documentUploadStorage';

const store: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => store[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    store[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete store[key];
  });
});

describe('documentUploadStorage history', () => {
  it('upserts books and supports home reset after session complete', async () => {
    await upsertDocumentUploadBook({
      id: 'book-1',
      title: 'Physics',
      originalName: 'physics.pdf',
      totalPages: 12,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const books = await getDocumentUploadBooks();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Physics');

    await markDocumentUploadSessionComplete('book-1');
    expect(await getDocumentUploadBooks()).toHaveLength(0);
    expect(await consumeDocumentUploadHomeReset()).toBe('book-1');
    expect(await consumeDocumentUploadHomeReset()).toBeNull();
  });
});
