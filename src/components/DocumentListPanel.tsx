import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

// Dummy document data
const DUMMY_DOCUMENTS = [
  {
    id: 1,
    title: 'Introduction to Algebra',
    type: 'PDF',
    size: '2.4 MB',
    subject: 'Mathematics',
    uploadedAt: '2024-01-03',
    icon: 'document-text',
    color: '#EF4444',
  },
  {
    id: 2,
    title: 'Cell Biology Basics',
    type: 'DOC',
    size: '1.8 MB',
    subject: 'Biology',
    uploadedAt: '2024-01-02',
    icon: 'document',
    color: '#10B981',
  },
  {
    id: 3,
    title: 'World War II History',
    type: 'PDF',
    size: '3.2 MB',
    subject: 'History',
    uploadedAt: '2024-01-01',
    icon: 'document-text',
    color: '#F59E0B',
  },
  {
    id: 4,
    title: 'Shakespeare Analysis',
    type: 'DOCX',
    size: '1.5 MB',
    subject: 'Literature',
    uploadedAt: '2023-12-30',
    icon: 'document',
    color: '#8B5CF6',
  },
  {
    id: 5,
    title: 'Physics Motion Laws',
    type: 'PDF',
    size: '2.1 MB',
    subject: 'Physics',
    uploadedAt: '2023-12-28',
    icon: 'document-text',
    color: '#0891B2',
  },
];

interface Props {
  selectedDocumentId: number | null;
  onDocumentSelect: (document: any) => void;
}

export default function DocumentListPanel({ selectedDocumentId, onDocumentSelect }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Ionicons name="folder-outline" size={24} color={theme.colors.primary} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Recent Documents</Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.documentList}>
          {DUMMY_DOCUMENTS.map((doc) => {
            const isSelected = selectedDocumentId === doc.id;
            return (
              <TouchableOpacity
                key={doc.id}
                style={[
                  styles.documentItem,
                  {
                    backgroundColor: isSelected ? theme.colors.primary + '15' : 'transparent',
                    borderLeftColor: isSelected ? theme.colors.primary : 'transparent',
                  },
                ]}
                onPress={() => onDocumentSelect(doc)}
                activeOpacity={0.7}
              >
                <View style={[styles.docIcon, { backgroundColor: doc.color + '20' }]}>
                  <Ionicons name={doc.icon as any} size={20} color={doc.color} />
                </View>
                <View style={styles.docInfo}>
                  <Text
                    style={[
                      styles.docTitle,
                      { color: theme.colors.text },
                      isSelected && { fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {doc.title}
                  </Text>
                  <View style={styles.docMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.typeText, { color: theme.colors.textSecondary }]}>
                        {doc.type}
                      </Text>
                    </View>
                    <Text style={[styles.docSize, { color: theme.colors.textSecondary }]}>
                      {doc.size}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  documentList: {
    padding: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    gap: 12,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
    gap: 6,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  docSize: {
    fontSize: 11,
  },
});
