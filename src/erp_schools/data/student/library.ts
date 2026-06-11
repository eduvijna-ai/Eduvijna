/** Student mock fixtures — library. */

import type { LibraryBook, LibraryCategory, IssuedBook } from '../../types/student';

export const libraryCategories: LibraryCategory[] = [
  { id: 'lc1', label: 'Fiction', icon: 'book-outline', accent: 'blue', count: 120 },
  { id: 'lc2', label: 'Non-Fiction', icon: 'document-text-outline', accent: 'green', count: 98 },
  { id: 'lc3', label: 'Science', icon: 'flask-outline', accent: 'purple', count: 76 },
  { id: 'lc4', label: 'History', icon: 'business-outline', accent: 'orange', count: 64 },
];

export const recommendedBooks: LibraryBook[] = [
  { id: 'b1', title: 'Wonder', author: 'R.J. Palacio', category: 'Fiction', rating: 4.6, coverColor: '#4FB5E1' },
  { id: 'b2', title: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'Fiction', rating: 4.7, coverColor: '#1F2937' },
  { id: 'b3', title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', rating: 4.5, coverColor: '#0B5563' },
  { id: 'b4', title: 'Panchatantra', author: 'Anonymous', category: 'Kids', rating: 4.4, coverColor: '#6D8B3A' },
  { id: 'b5', title: 'The Secret Garden', author: 'F.H. Burnett', category: 'Fiction', rating: 4.3, coverColor: '#2F6B3A' },
];

export const ebooks: LibraryBook[] = [
  { id: 'eb1', title: 'The Adventures of Tom Sawyer', author: 'Mark Twain', category: 'Fiction', rating: 4.2, coverColor: '#8B5E3C', isEbook: true },
  { id: 'eb2', title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', category: 'Non-Fiction', rating: 4.8, coverColor: '#C2410C', isEbook: true },
  { id: 'eb3', title: 'Matilda', author: 'Roald Dahl', category: 'Fiction', rating: 4.6, coverColor: '#DB2777', isEbook: true },
  { id: 'eb4', title: 'The Jungle Book', author: 'Rudyard Kipling', category: 'Fiction', rating: 4.5, coverColor: '#15803D', isEbook: true },
];

export const issuedBooks: IssuedBook[] = [
  { id: 'is1', title: 'Charlie and the Chocolate Factory', author: 'Roald Dahl', issuedOn: '10 May 2024', dueOn: '24 May 2024', daysLeft: 2 },
];
