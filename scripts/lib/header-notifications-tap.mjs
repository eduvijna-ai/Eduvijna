/**
 * Tap notifications bell in mobile app header (no fixed coordinates).
 */
export function tapNotificationsBell(adb, xml) {
  const re = /clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/gi;
  const cands = [];
  let m;
  while ((m = re.exec(xml))) {
    const x1 = Number(m[1]);
    const y1 = Number(m[2]);
    const x2 = Number(m[3]);
    const y2 = Number(m[4]);
    if (y1 < 70 || y2 > 300 || x1 < 600) continue;
    const midX = (x1 + x2) / 2;
    cands.push({ x1, y1, x2, y2, midX, area: (x2 - x1) * (y2 - y1) });
  }
  cands.sort((a, b) => b.midX - a.midX);
  // Header order (mobile): create (+), notifications bell, profile avatar (rightmost).
  const bell = cands[1] || cands.find((c) => c.midX > 780 && c.midX < 920) || cands[0];
  if (!bell) return { tapped: false, reason: 'no_header_clickable' };
  const x = ((bell.x1 + bell.x2) / 2) | 0;
  const y = ((bell.y1 + bell.y2) / 2) | 0;
  adb(`shell input tap ${x} ${y}`);
  return { tapped: true, tap: { x, y }, candidateCount: cands.length };
}

export function classifyNotificationsRoute(xml) {
  const onRoute =
    /Pending quizzes|No pending quizzes|No new submissions|New submissions|Loading notifications/i.test(
      xml,
    );
  return {
    onRoute,
    markers: {
      pendingQuizzes: /Pending quizzes/i.test(xml),
      emptyStudent: /No pending quizzes/i.test(xml),
      loading: /Loading notifications/i.test(xml),
      teacherEmpty: /No new submissions/i.test(xml),
      teacherSubmissions: /New submissions/i.test(xml),
    },
  };
}
