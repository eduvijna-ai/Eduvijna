import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import DocumentLibraryScreen from '../screens/document-upload/DocumentLibraryScreen';
import { uploadBookWithMetadata } from '../core/services/documentUploadApi';

jest.mock('expo-document-picker');

jest.mock('../core/services/documentUploadApi', () => ({
  ...jest.requireActual('../core/services/documentUploadApi'),
  listServerBooks: jest.fn(async () => []),
  getBookFilters: jest.fn(async () => ({ grade_levels: [], subjects: [] })),
  uploadBookWithMetadata: jest.fn(async () => ({
    docId: 'doc-1',
    title: 'Book',
    filename: 'book.pdf',
    totalPages: 1,
  })),
}));

jest.mock('@core/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 't1', role: 'instructor' } }),
}));

jest.mock('@context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#005',
        background: '#fff',
        text: '#000',
        textSecondary: '#666',
        border: '#ccc',
        card: '#fff',
      },
    },
  }),
}));

const mockUpload = uploadBookWithMetadata as jest.MockedFunction<typeof uploadBookWithMetadata>;

describe('DocumentLibraryScreen web upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes picker File/Blob through uploadBookWithMetadata', async () => {
    const webFile = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'blob:local',
          name: 'chapter.pdf',
          mimeType: 'application/pdf',
          file: webFile,
        },
      ],
    });

    const navigation = { navigate: jest.fn() };
    const { getByText } = render(<DocumentLibraryScreen navigation={navigation} />);

    fireEvent.press(getByText('Upload Book'));
    fireEvent.press(getByText('Choose PDF or image'));

    fireEvent.changeText(getByPlaceholderText('e.g. Physics Chapter 3'), 'Chapter 1');
    fireEvent.press(getByText('Upload to Library'));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'chapter.pdf',
          file: webFile,
        }),
      );
    });
  });
});
