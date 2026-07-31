/**
 * School Documents helpers — web SchoolDocumentsPanel payload + PDF parity.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import {
  CERTIFICATE_CATALOG,
  classSectionLabel,
  formatPrintDate,
  type AcademicDocId,
  type CertificateKind,
} from './analyticsMeta';

export type SchoolPrintProfile = {
  schoolId: number;
  schoolName: string;
  logoUrl?: string;
  addressLine: string;
  cityStatePin: string;
  phone?: string;
  email?: string;
  website?: string;
  boardName?: string;
  affiliation?: string;
  academicYearLabel: string;
};

export type StudentPrintInfo = {
  studentId?: number;
  name: string;
  admissionNumber?: string;
  rollNumber?: string;
  classSection: string;
  dateOfBirth?: string;
  gender?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function headerHtml(profile: SchoolPrintProfile, title: string): string {
  return `
  <div style="text-align:center;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:16px">
    <div style="font-size:18px;font-weight:800;color:#0f172a">${esc(profile.schoolName)}</div>
    <div style="font-size:11px;color:#64748b">${esc(profile.addressLine)} · ${esc(profile.cityStatePin)}</div>
    <div style="font-size:11px;color:#64748b">${[profile.phone, profile.email]
      .filter((v): v is string => !!v)
      .map(esc)
      .join(' · ')}</div>
    ${profile.boardName ? `<div style="font-size:11px;color:#64748b">${esc(profile.boardName)}${profile.affiliation ? ` · Aff. ${esc(profile.affiliation)}` : ''}</div>` : ''}
    <div style="margin-top:8px;font-size:15px;font-weight:700;color:#0f766e">${esc(title)}</div>
    <div style="font-size:11px;color:#94a3b8">Academic Year ${esc(profile.academicYearLabel)}</div>
  </div>`;
}

function studentMetaHtml(student: StudentPrintInfo): string {
  return `
  <table style="width:100%;font-size:12px;margin-bottom:14px">
    <tr><td><b>Student</b></td><td>${esc(student.name)}</td><td><b>Class</b></td><td>${esc(student.classSection)}</td></tr>
    <tr><td><b>Admission No.</b></td><td>${esc(student.admissionNumber || '—')}</td><td><b>Roll</b></td><td>${esc(student.rollNumber || '—')}</td></tr>
  </table>`;
}

export function studentPrintInfoFromByUser(row: Record<string, unknown>): StudentPrintInfo {
  return {
    studentId:
      row.profile_id != null ? Number(row.profile_id) : undefined,
    name: String(row.name || row.username || 'Student'),
    admissionNumber: row.admission_number != null ? String(row.admission_number) : undefined,
    classSection: classSectionLabel(
      row.class_name != null ? String(row.class_name) : undefined,
      row.section_name != null ? String(row.section_name) : undefined,
    ),
    dateOfBirth: row.date_of_birth
      ? formatPrintDate(String(row.date_of_birth))
      : undefined,
    gender: row.gender != null ? String(row.gender) : undefined,
  };
}

export function studentPrintInfoFromExamResult(
  result: Record<string, unknown>,
  className?: string,
): StudentPrintInfo {
  return {
    studentId: result.student_id != null ? Number(result.student_id) : undefined,
    name: String(result.student_name || 'Student'),
    admissionNumber:
      result.admission_number != null ? String(result.admission_number) : undefined,
    rollNumber: result.roll_number != null ? String(result.roll_number) : undefined,
    classSection: classSectionLabel(
      className,
      result.section_name != null ? String(result.section_name) : undefined,
    ),
  };
}

export function mapSchoolToProfile(
  school: Record<string, unknown>,
  academicYearLabel: string,
): SchoolPrintProfile {
  const addressParts = [school.address, school.city, school.state].filter(Boolean);
  return {
    schoolId: Number(school.school_id ?? 0),
    schoolName: String(school.school_name || 'School'),
    logoUrl: school.logo_url != null ? String(school.logo_url) : undefined,
    addressLine: addressParts.slice(0, 2).map(String).join(', ') || String(school.address || '—'),
    cityStatePin: [school.city, school.state].filter(Boolean).map(String).join(', ') || '—',
    phone: school.phone != null ? String(school.phone) : undefined,
    email: school.email != null ? String(school.email) : undefined,
    website: school.website != null ? String(school.website) : undefined,
    boardName: school.board_name != null ? String(school.board_name) : undefined,
    affiliation:
      school.board_registration_number != null
        ? String(school.board_registration_number)
        : undefined,
    academicYearLabel,
  };
}

function buildAcademicReportHtml(
  profile: SchoolPrintProfile,
  student: StudentPrintInfo,
  examTitle: string,
  result: Record<string, unknown>,
): string {
  const subjects = Array.isArray(result.subject_details)
    ? (result.subject_details as Record<string, unknown>[])
    : [];
  const rows = subjects
    .map(
      (s) =>
        `<tr><td>${esc(String(s.subject_name || 'Subject'))}</td><td>${esc(String(s.marks_obtained ?? '—'))}</td><td>${esc(String(s.max_marks ?? '—'))}</td><td>${esc(String(s.result_status || '—'))}</td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#0f172a;padding:24px}
    table{width:100%;border-collapse:collapse} th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
    th{background:#0f766e;color:#fff} .meta{margin-top:12px;font-size:12px}
  </style></head><body>
    ${headerHtml(profile, 'Academic Report Card')}
    ${studentMetaHtml(student)}
    <div class="meta"><b>Exam:</b> ${esc(examTitle)} · <b>Doc:</b> RC-${esc(String(result.exam_item_id || ''))}-${esc(String(result.student_id || ''))}</div>
    <table style="margin-top:12px"><thead><tr><th>Subject</th><th>Marks</th><th>Max</th><th>Status</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4">No subject marks</td></tr>'}</tbody></table>
    <div class="meta" style="margin-top:14px">
      <b>Grade:</b> ${esc(String(result.grade || '—'))} ·
      <b>%:</b> ${esc(String(result.percentage ?? '—'))} ·
      <b>Rank:</b> ${esc(String(result.rank ?? '—'))}
    </div>
  </body></html>`;
}

function buildProgressReportHtml(
  profile: SchoolPrintProfile,
  student: StudentPrintInfo,
  examTitle: string,
  result: Record<string, unknown>,
): string {
  const subjects = Array.isArray(result.subject_details)
    ? (result.subject_details as Record<string, unknown>[])
    : [];
  const rows = subjects
    .map(
      (s) =>
        `<tr><td>${esc(String(s.subject_name || 'Subject'))}</td><td>${esc(String(s.marks_obtained ?? '—'))} / ${esc(String(s.max_marks ?? '—'))}</td><td>${esc(String(s.result_status || '—'))}</td></tr>`,
    )
    .join('');
  const remark =
    String(result.result_status || '') === 'pass'
      ? 'Satisfactory progress.'
      : 'Needs improvement.';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#0f172a;padding:24px}
    table{width:100%;border-collapse:collapse} th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
    th{background:#7c3aed;color:#fff}
  </style></head><body>
    ${headerHtml(profile, 'Progress Report')}
    ${studentMetaHtml(student)}
    <p><b>Term / Exam:</b> ${esc(examTitle)}</p>
    <table><thead><tr><th>Subject</th><th>Marks</th><th>Grade</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3">No subject marks</td></tr>'}</tbody></table>
    <p style="margin-top:14px"><b>Teacher remark:</b> ${esc(remark)}</p>
  </body></html>`;
}

function buildCoScholasticHtml(
  profile: SchoolPrintProfile,
  student: StudentPrintInfo,
  documentNumber: string,
): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#0f172a;padding:24px}
    table{width:100%;border-collapse:collapse;margin-top:10px} th,td{border:1px solid #e2e8f0;padding:6px 8px}
    th{background:#16a34a;color:#fff}
  </style></head><body>
    ${headerHtml(profile, 'Co-Scholastic Report')}
    ${studentMetaHtml(student)}
    <p><b>Doc No:</b> ${esc(documentNumber)}</p>
    <table><thead><tr><th>Area</th><th>Grade</th><th>Remark</th></tr></thead>
    <tbody>
      <tr><td>Work Education</td><td>—</td><td>To be assessed</td></tr>
      <tr><td>Art Education</td><td>—</td><td>To be assessed</td></tr>
      <tr><td>Health &amp; Physical Education</td><td>—</td><td>To be assessed</td></tr>
    </tbody></table>
    <p style="margin-top:12px;color:#64748b">Co-scholastic grades will appear when entered by class teachers.</p>
  </body></html>`;
}

function buildTransferCertificateHtml(
  profile: SchoolPrintProfile,
  student: StudentPrintInfo,
): string {
  const docNo = `TC/${student.admissionNumber || student.studentId || '—'}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#0f172a;padding:24px;line-height:1.5}
    .box{border:1px solid #cbd5e1;padding:14px;border-radius:8px;margin-top:12px}
  </style></head><body>
    ${headerHtml(profile, 'Transfer Certificate')}
    ${studentMetaHtml(student)}
    <div class="box">
      <p><b>TC / Doc No:</b> ${esc(docNo)}</p>
      <p><b>Date of leaving:</b> ${esc(formatPrintDate(new Date()))}</p>
      <p><b>Last class studied:</b> ${esc(student.classSection)}</p>
      <p><b>Promotion status:</b> As per school records</p>
      <p><b>Conduct:</b> Good</p>
      <p><b>Reason for leaving:</b> Parent request / transfer</p>
      <p><b>Subjects studied:</b> As per school curriculum</p>
    </div>
  </body></html>`;
}

function certificateBodies(
  kind: CertificateKind,
  profile: SchoolPrintProfile,
  student: StudentPrintInfo,
): string[] {
  const name = student.name;
  const cls = student.classSection;
  const map: Record<CertificateKind, string[]> = {
    transfer_certificate: [
      `This is to certify that ${name}, Admission No. ${student.admissionNumber || '—'}, was a bonafide student of this institution in class ${cls}.`,
      'Details of transfer are recorded in the official TC register of the school.',
    ],
    bonafide: [
      `This is to certify that ${name}, bearing Admission No. ${student.admissionNumber || '—'}, is a bonafide student of this school studying in class ${cls} during the academic year ${profile.academicYearLabel}.`,
    ],
    study: [
      `This is to certify that ${name} is a regular student of class ${cls} in this school for the academic year ${profile.academicYearLabel}.`,
    ],
    character: [
      `This is to certify that ${name}, student of class ${cls}, bears a good moral character and has conducted themselves well during their tenure at this institution.`,
    ],
    conduct: [
      `This is to certify that ${name} has maintained satisfactory conduct and discipline while studying in class ${cls}.`,
    ],
    achievement: [
      `This certificate is awarded to ${name} of class ${cls} in recognition of outstanding achievement and dedication.`,
    ],
    participation: [
      `This is to certify that ${name} of class ${cls} actively participated in school programmes during ${profile.academicYearLabel}.`,
    ],
    merit: [
      `This merit certificate is presented to ${name} of class ${cls} for excellent academic performance.`,
    ],
    sports: [
      `This is to certify that ${name} of class ${cls} has represented the school in sports activities with commendable spirit and effort.`,
    ],
    completion: [
      `This is to certify that ${name} has successfully completed the prescribed requirements for class ${cls} for ${profile.academicYearLabel}.`,
    ],
    appreciation: [
      `The school appreciates the sincere efforts of ${name}, class ${cls}, and encourages continued excellence.`,
    ],
  };
  return map[kind];
}

function buildCertificateHtml(
  kind: CertificateKind,
  profile: SchoolPrintProfile,
  student: StudentPrintInfo,
): string {
  const meta = CERTIFICATE_CATALOG.find((c) => c.kind === kind)!;
  const paragraphs = certificateBodies(kind, profile, student)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
  const docNo = `${meta.code}-${student.admissionNumber || student.studentId || Date.now()}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    body{font-family:Georgia,serif;font-size:14px;color:#0f172a;padding:28px;line-height:1.6}
    .title{text-align:center;font-size:20px;font-weight:800;color:#0f766e;margin:12px 0 4px}
    .sub{text-align:center;color:#64748b;font-size:12px;margin-bottom:16px}
    .hl{text-align:center;font-weight:700;color:#ea580c;margin:8px 0}
  </style></head><body>
    ${headerHtml(profile, meta.title)}
    ${meta.subtitle ? `<div class="sub">${esc(meta.subtitle)}</div>` : ''}
    ${meta.highlight ? `<div class="hl">${esc(meta.highlight)}</div>` : ''}
    ${paragraphs}
    <p style="margin-top:20px;font-size:12px;color:#64748b">
      Doc No: ${esc(docNo)} · Issued: ${esc(formatPrintDate(new Date()))}<br/>
      Student: ${esc(student.name)} · Class: ${esc(student.classSection)}
    </p>
  </body></html>`;
}

async function shareHtmlPdf(html: string, fileName: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: fileName,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ html });
  }
}

export async function printAcademicDocument(opts: {
  docId: AcademicDocId;
  profile: SchoolPrintProfile;
  student: StudentPrintInfo;
  examTitle?: string;
  result?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { docId, profile, student, examTitle, result } = opts;
    let html = '';
    let fileName = 'document.pdf';
    if (docId === 'transfer_certificate') {
      html = buildTransferCertificateHtml(profile, student);
      fileName = `tc-${student.admissionNumber || student.name}.pdf`;
    } else if (docId === 'co_scholastic') {
      html = buildCoScholasticHtml(profile, student, `CS-${Date.now()}`);
      fileName = `co-scholastic-${student.admissionNumber || student.name}.pdf`;
    } else if (!result || !examTitle) {
      throw new Error('Select an exam to pull marks from published results.');
    } else if (docId === 'academic_report') {
      html = buildAcademicReportHtml(profile, student, examTitle, result);
      fileName = `report-card-${student.admissionNumber || student.name}.pdf`;
    } else {
      html = buildProgressReportHtml(profile, student, examTitle, result);
      fileName = `progress-${student.admissionNumber || student.name}.pdf`;
    }
    await shareHtmlPdf(html, fileName);
  } catch (e) {
    Alert.alert(
      'Document failed',
      e instanceof Error ? e.message : 'Could not generate document',
    );
    throw e;
  }
}

export async function printCertificateDocument(
  kind: CertificateKind,
  profile: SchoolPrintProfile,
  student: StudentPrintInfo,
): Promise<void> {
  try {
    if (kind === 'transfer_certificate') {
      await shareHtmlPdf(
        buildTransferCertificateHtml(profile, student),
        `tc-${student.admissionNumber || student.name}.pdf`,
      );
      return;
    }
    await shareHtmlPdf(
      buildCertificateHtml(kind, profile, student),
      `${kind}-${student.admissionNumber || student.name}.pdf`,
    );
  } catch (e) {
    Alert.alert(
      'Document failed',
      e instanceof Error ? e.message : 'Could not generate document',
    );
    throw e;
  }
}
