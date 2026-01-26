/**
 * Date filtering utilities for quiz-related screens
 * Provides reusable date range filters and formatting functions
 */

export type DateFilterType = 
  | 'this_week'
  | 'this_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'all' 
  | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get date range based on filter type
 */
export function getDateRange(filterType: DateFilterType): DateRange {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (filterType) {
    case 'this_week':
      // Start from Monday of current week
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust if Sunday
      startDate.setDate(now.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'last_7_days':
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'last_30_days':
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'this_month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'last_3_months':
      startDate.setMonth(now.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'last_6_months':
      startDate.setMonth(now.getMonth() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'this_year':
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'all':
    default:
      startDate = new Date(0); // Beginning of time
      break;
  }

  return { startDate, endDate };
}

/**
 * Filter array of items by date field and filter type
 */
export function filterByDateRange<T>(
  items: T[],
  dateField: keyof T,
  filterType: DateFilterType
): T[] {
  if (filterType === 'all') {
    return items;
  }

  const { startDate, endDate } = getDateRange(filterType);

  return items.filter((item) => {
    const itemDate = new Date(item[dateField] as string);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/**
 * Get dropdown options for date filters
 */
export function getDateFilterOptions() {
  return [
    { label: 'All Time', value: 'all' as DateFilterType },
    { label: 'This Week', value: 'this_week' as DateFilterType },
    { label: 'This Month', value: 'this_month' as DateFilterType },
    { label: 'Last 3 Months', value: 'last_3_months' as DateFilterType },
    { label: 'Last 6 Months', value: 'last_6_months' as DateFilterType },
    { label: 'This Year', value: 'this_year' as DateFilterType },
    { label: 'Custom', value: 'custom' as DateFilterType },
  ];
}

/**
 * Format date for display
 */
export function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Format date and time for display
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get relative time (e.g., "2h ago", "3d ago")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return formatDisplayDate(dateString);
  }
}
