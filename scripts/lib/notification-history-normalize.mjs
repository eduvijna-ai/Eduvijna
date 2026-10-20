function isValidNotificationRowId(id) {
  if (typeof id === 'number') {
    return Number.isFinite(id);
  }
  if (typeof id === 'string') {
    return id.trim() !== '';
  }
  return false;
}

function isNotificationRow(value) {
  if (!value || typeof value !== 'object') return false;
  return (
    isValidNotificationRowId(value.id) &&
    typeof value.title === 'string' &&
    typeof value.body === 'string'
  );
}

function resolveNotificationHistoryTotal(explicitTotal, pageLength) {
  if (pageLength < 0) {
    return { ok: false, error: 'page_length_invalid' };
  }
  if (explicitTotal == null || explicitTotal === '') {
    return { ok: true, total: pageLength };
  }
  const numeric = Number(explicitTotal);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 0) {
    return { ok: false, error: 'total_invalid' };
  }
  if (numeric < pageLength) {
    return { ok: false, error: 'total_smaller_than_page' };
  }
  return { ok: true, total: numeric };
}

export function normalizeNotificationHistoryPayload(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data) === false && data.parseError) {
    if (data?.parseError) {
      return { ok: false, responseShape: 'parse_error', error: String(data.parseError) };
    }
    return { ok: false, responseShape: 'invalid', error: 'not_object' };
  }
  if (Array.isArray(data)) {
    if (data.length > 0 && !data.every(isNotificationRow)) {
      return { ok: false, responseShape: 'unknown', error: 'array_items_invalid' };
    }
    return {
      ok: true,
      notifications: data,
      total: data.length,
      responseShape: 'array_root',
    };
  }
  if (Array.isArray(data.notifications)) {
    if (data.notifications.length > 0 && !data.notifications.every(isNotificationRow)) {
      return { ok: false, responseShape: 'unknown', error: 'notifications_items_invalid' };
    }
    const totalResolved = resolveNotificationHistoryTotal(data.total, data.notifications.length);
    if (!totalResolved.ok) {
      return { ok: false, responseShape: 'unknown', error: totalResolved.error };
    }
    return {
      ok: true,
      notifications: data.notifications,
      total: totalResolved.total,
      responseShape: 'wrapped_notifications',
    };
  }
  if (Array.isArray(data.data)) {
    if (data.data.length > 0 && !data.data.every(isNotificationRow)) {
      return { ok: false, responseShape: 'unknown', error: 'data_items_invalid' };
    }
    const totalResolved = resolveNotificationHistoryTotal(data.total, data.data.length);
    if (!totalResolved.ok) {
      return { ok: false, responseShape: 'unknown', error: totalResolved.error };
    }
    return {
      ok: true,
      notifications: data.data,
      total: totalResolved.total,
      responseShape: 'wrapped_data',
    };
  }
  return { ok: false, responseShape: 'unknown', error: 'unrecognized_shape' };
}
