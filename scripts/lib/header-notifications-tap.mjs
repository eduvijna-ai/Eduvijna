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
    if (y1 < 70 || y2 > 220 || x1 < 700) continue;
    const midX = (x1 + x2) / 2;
    cands.push({ x1, y1, x2, y2, midX, area: (x2 - x1) * (y2 - y1) });
  }
  cands.sort((a, b) => a.midX - b.midX);
  const bell = cands.find((c) => c.midX > 880 && c.midX < 1010) || cands[cands.length - 2];
  if (!bell) return { tapped: false, reason: 'no_header_clickable' };
  const x = ((bell.x1 + bell.x2) / 2) | 0;
  const y = ((bell.y1 + bell.y2) / 2) | 0;
  adb(`shell input tap ${x} ${y}`);
  return { tapped: true, tap: { x, y }, candidateCount: cands.length };
}

export function classifyNotificationsRoute(xml) {
  const onRoute =
    /Pending quizzes|No pending quizzes|No new submissions|Loading notifications/i.test(xml);
  return {
    onRoute,
    markers: {
      pendingQuizzes: /Pending quizzes/i.test(xml),
      emptyStudent: /No pending quizzes/i.test(xml),
      loading: /Loading notifications/i.test(xml),
      teacherEmpty: /No new submissions/i.test(xml),
    },
  };
}
