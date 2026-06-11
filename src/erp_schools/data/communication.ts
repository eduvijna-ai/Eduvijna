/** Mock fixtures — parent communication + chat threads. */

import type { Conversation, ChatMessage, Announcement } from '../types/domain';

export const conversations: Conversation[] = [
  { id: 'cv1', parentName: 'Mrs. Neha Sharma', parentRelation: 'Mother', studentName: 'Aarav Sharma', studentRollNo: 'S8123', preview: 'Thank you for the update on Aarav’s performance.', timeLabel: '10:30 AM', unread: 2 },
  { id: 'cv2', parentName: 'Mr. Rahul Verma', parentRelation: 'Father', studentName: 'Ananya Verma', studentRollNo: 'S8124', preview: 'When will the unit test results be declared?', timeLabel: 'Yesterday', unread: 1 },
  { id: 'cv3', parentName: 'Mrs. Pooja Singh', parentRelation: 'Mother', studentName: 'Kabir Singh', studentRollNo: 'S8125', preview: 'Kabir is enjoying the science activities.', timeLabel: '12 May 2025', unread: 0 },
  { id: 'cv4', parentName: 'Mr. Amit Patel', parentRelation: 'Father', studentName: 'Diya Patel', studentRollNo: 'S8126', preview: 'Please share the homework for science.', timeLabel: '10 May 2025', unread: 0 },
  { id: 'cv5', parentName: 'Grade 8 Parents Group', parentRelation: 'Group', studentName: '32 Parents', preview: 'Reminder: PTM on Saturday at 10:00 AM.', timeLabel: '09 May 2025', unread: 0, isGroup: true },
];

export const communicationAnnouncements: Announcement[] = [
  { id: 'ca1', title: 'Science Project Submission', body: 'Dear Parents, This is to inform you that the Science project is due on 20 May 2025. Please guide your child to complete it on time.', date: '11 May 2025', isNew: true, scope: 'class' },
  { id: 'ca2', title: 'PTM Schedule', body: 'PTM for Class 8 will be held on 18 May 2025 (Saturday) from 10:00 AM to 1:00 PM.', date: '09 May 2025', scope: 'school' },
];

export const chatThreads: Record<string, ChatMessage[]> = {
  cv1: [
    { id: 'msg1', text: 'Good morning ma’am. How is Aarav doing in Science?', timeLabel: '10:12 AM', fromMe: false },
    { id: 'msg2', text: 'Good morning! Aarav is doing very well, especially in practical work.', timeLabel: '10:20 AM', fromMe: true },
    { id: 'msg3', text: 'That’s wonderful to hear.', timeLabel: '10:28 AM', fromMe: false },
    { id: 'msg4', text: 'Thank you for the update on Aarav’s performance.', timeLabel: '10:30 AM', fromMe: false },
  ],
};
