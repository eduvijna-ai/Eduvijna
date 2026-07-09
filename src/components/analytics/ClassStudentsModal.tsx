import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StudentRow {
  student_id?: string;
  user_id?: string;
  id?: string;
  student_name?: string;
  student_fullname?: string;
  full_name?: string;
  fullname?: string;
  name?: string;
  student?: { name?: string; email?: string };
  user_name?: string;
  username?: string;
  email?: string;
  student_email?: string;
  user_email?: string;
  status?: string;
  enrollment_status?: string;
  student_status?: string;
}

function studentRowKey(s: StudentRow, index: number): string {
  const id = s.student_id ?? s.user_id ?? s.id;
  return id != null ? `${String(id)}-${index}` : `row-${index}`;
}

function studentId(s: StudentRow): string {
  return s.student_id || s.user_id || s.id || '-';
}

function studentName(s: StudentRow): string {
  return (
    s.student_name ||
    s.student_fullname ||
    s.full_name ||
    s.fullname ||
    s.name ||
    s.student?.name ||
    s.user_name ||
    s.username ||
    '-'
  );
}

function studentEmail(s: StudentRow): string {
  return s.email || s.student_email || s.user_email || s.student?.email || '-';
}

function studentStatus(s: StudentRow): string {
  return s.status || s.enrollment_status || s.student_status || 'Active';
}

interface Props {
  visible: boolean;
  loading: boolean;
  className: string;
  students: StudentRow[];
  onClose: () => void;
  colors: { card: string; background: string; text: string; textSecondary: string; border: string; primary: string };
}

export default function ClassStudentsModal({ visible, loading, className, students, onClose, colors }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>All Students — {className}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading students...</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No students found in this class</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.tableWrap}>
              <View style={[styles.table, { borderColor: colors.border }]}>
                <View style={[styles.tableHead, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                  <Text style={[styles.th, styles.colNum, { color: colors.textSecondary }]}>#</Text>
                  <Text style={[styles.th, styles.colId, { color: colors.textSecondary }]}>Student ID</Text>
                  <Text style={[styles.th, styles.colName, { color: colors.textSecondary }]}>Student Name</Text>
                  <Text style={[styles.th, styles.colEmail, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[styles.th, styles.colStatus, { color: colors.textSecondary }]}>Status</Text>
                </View>
                {students.map((s, index) => (
                  <View
                    key={studentRowKey(s, index)}
                    style={[styles.tableRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                  >
                    <Text style={[styles.td, styles.colNum, { color: colors.text }]}>{index + 1}</Text>
                    <Text style={[styles.td, styles.colId, { color: colors.text }]} numberOfLines={1}>
                      {studentId(s)}
                    </Text>
                    <Text style={[styles.td, styles.colName, { color: colors.text }]} numberOfLines={2}>
                      {studentName(s)}
                    </Text>
                    <Text style={[styles.td, styles.colEmail, { color: colors.textSecondary }]} numberOfLines={2}>
                      {studentEmail(s)}
                    </Text>
                    <View style={styles.colStatus}>
                      <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}14` }]}>
                        <Text style={[styles.statusText, { color: colors.primary }]}>{studentStatus(s)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        )}

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Total Students: {students.length}
          </Text>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14 },
  empty: { textAlign: 'center', fontSize: 14 },
  tableWrap: { padding: 16, paddingBottom: 8 },
  table: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', minWidth: 520 },
  tableHead: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  th: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  td: { fontSize: 13 },
  colNum: { width: 32 },
  colId: { width: 90 },
  colName: { width: 130 },
  colEmail: { width: 160 },
  colStatus: { width: 90, justifyContent: 'center' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  footerText: { fontSize: 13, fontWeight: '600' },
  closeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
