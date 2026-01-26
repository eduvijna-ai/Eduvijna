import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

interface Props {
  selectedDocument: any;
}

export default function DocumentDetailsPanel({ selectedDocument }: Props) {
  const { theme } = useTheme();

  if (!selectedDocument) {
    return (
      <View style={[styles.panel, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Document Details</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Select a document to view details
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Document Details</Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailsContainer}>
          {/* Document Icon and Title */}
          <View style={styles.documentHeader}>
            <View style={[styles.largeIcon, { backgroundColor: selectedDocument.color + '20' }]}>
              <Ionicons name={selectedDocument.icon} size={32} color={selectedDocument.color} />
            </View>
            <Text style={[styles.documentTitle, { color: theme.colors.text }]}>
              {selectedDocument.title}
            </Text>
          </View>

          {/* Metadata Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Information</Text>
            <View style={styles.metadataList}>
              <View style={styles.metadataRow}>
                <View style={styles.metadataLabel}>
                  <Ionicons name="document-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>Type</Text>
                </View>
                <Text style={[styles.valueText, { color: theme.colors.text }]}>
                  {selectedDocument.type}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <View style={styles.metadataLabel}>
                  <Ionicons name="resize-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>Size</Text>
                </View>
                <Text style={[styles.valueText, { color: theme.colors.text }]}>
                  {selectedDocument.size}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <View style={styles.metadataLabel}>
                  <Ionicons name="book-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>Subject</Text>
                </View>
                <Text style={[styles.valueText, { color: theme.colors.text }]}>
                  {selectedDocument.subject}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <View style={styles.metadataLabel}>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.labelText, { color: theme.colors.textSecondary }]}>Uploaded</Text>
                </View>
                <Text style={[styles.valueText, { color: theme.colors.text }]}>
                  {new Date(selectedDocument.uploadedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              This document contains educational content about {selectedDocument.subject.toLowerCase()}. 
              You can use this document to generate quiz questions automatically.
            </Text>
          </View>

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="stats-chart" size={20} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>12</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Quizzes Created
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="eye" size={20} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.text }]}>45</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Total Views
                </Text>
              </View>
            </View>
          </View>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  detailsContainer: {
    padding: 16,
    gap: 24,
  },
  documentHeader: {
    alignItems: 'center',
    gap: 12,
  },
  largeIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metadataList: {
    gap: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelText: {
    fontSize: 13,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
});
