/**
 * Admin Notices — web NoticesTab parity.
 * Reuses teacher Notice Board (list/search/categories/CRUD) on AdminStack.
 */

import React from 'react';
import NoticeBoardScreen from '../../teacher/notices/NoticeBoardScreen';

export default function AnnouncementsScreen() {
  return <NoticeBoardScreen role="admin" />;
}
