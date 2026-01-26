# Pagination Implementation Guide

## Overview
All API fetch functions now load **10 items initially** and support loading more in batches of **10 items** for better performance and user experience.

## Updated Functions

### 1. `fetchTeacherQuizzes(filters?)`
**Initial Load**: 10 quizzes  
**Load More**: Pass `limit` and `offset` in filters

```typescript
// Initial load - gets first 10 quizzes
const initialData = await fetchTeacherQuizzes();

// Load next 10 quizzes
const nextData = await fetchTeacherQuizzes({ 
  limit: 10, 
  offset: 10 
});

// Load next 10 after that
const moreData = await fetchTeacherQuizzes({ 
  limit: 10, 
  offset: 20 
});
```

### 2. `fetchStudentQuizzes(filters?)`
**Initial Load**: 10 quizzes  
**Load More**: Pass `limit` and `offset` in filters

```typescript
// Initial load - gets first 10 quizzes
const initialData = await fetchStudentQuizzes();

// Load next 10 quizzes
const nextData = await fetchStudentQuizzes({ 
  limit: 10, 
  offset: 10 
});
```

### 3. `fetchAllStudents(limit?, offset?)`
**Initial Load**: 10 students  
**Load More**: Pass new limit and offset

```typescript
// Initial load - gets first 10 students
const initialData = await fetchAllStudents();

// Load next 10 students
const nextData = await fetchAllStudents(10, 10);

// Load next 10 after that
const moreData = await fetchAllStudents(10, 20);
```

### 4. `fetchClassroomStudents(classroomId, limit?, offset?)`
**Initial Load**: 10 students  
**Load More**: Pass new limit and offset

```typescript
// Initial load - gets first 10 students in classroom
const initialData = await fetchClassroomStudents('classroom-123');

// Load next 10 students
const nextData = await fetchClassroomStudents('classroom-123', 10, 10);

// Load next 10 after that
const moreData = await fetchClassroomStudents('classroom-123', 10, 20);
```

## React Component Example

### Teacher Quizzes List with Load More

```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { fetchTeacherQuizzes } from '@core/services/dashboardApi';

export default function QuizzesList() {
  const [quizzes, setQuizzes] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Initial load
  useEffect(() => {
    loadInitialQuizzes();
  }, []);

  const loadInitialQuizzes = async () => {
    setLoading(true);
    try {
      const response = await fetchTeacherQuizzes({ limit: 10, offset: 0 });
      setQuizzes(response.data);
      setOffset(10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreQuizzes = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = await fetchTeacherQuizzes({ limit: 10, offset });
      setQuizzes(prev => [...prev, ...response.data]);
      setOffset(prev => prev + 10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Failed to load more quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlatList
      data={quizzes}
      renderItem={({ item }) => <QuizCard quiz={item} />}
      keyExtractor={item => item.quiz_id}
      ListFooterComponent={() => (
        hasMore && (
          <TouchableOpacity 
            onPress={loadMoreQuizzes}
            style={styles.loadMoreButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#5B21B6" />
            ) : (
              <Text style={styles.loadMoreText}>Load More</Text>
            )}
          </TouchableOpacity>
        )
      )}
    />
  );
}
```

### Students List with Load More

```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { fetchAllStudents } from '@core/services/dashboardApi';

export default function StudentsList() {
  const [students, setStudents] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Initial load
  useEffect(() => {
    loadInitialStudents();
  }, []);

  const loadInitialStudents = async () => {
    setLoading(true);
    try {
      const response = await fetchAllStudents(10, 0);
      setStudents(response.data);
      setOffset(10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreStudents = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = await fetchAllStudents(10, offset);
      setStudents(prev => [...prev, ...response.data]);
      setOffset(prev => prev + 10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Failed to load more students:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlatList
      data={students}
      renderItem={({ item }) => <StudentCard student={item} />}
      keyExtractor={item => item.student_id}
      ListFooterComponent={() => (
        hasMore && (
          <TouchableOpacity 
            onPress={loadMoreStudents}
            style={styles.loadMoreButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#5B21B6" />
            ) : (
              <Text style={styles.loadMoreText}>Load More</Text>
            )}
          </TouchableOpacity>
        )
      )}
    />
  );
}
```

### Infinite Scroll (Alternative to Load More Button)

```typescript
export default function InfiniteScrollList() {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = await fetchTeacherQuizzes({ limit: 10, offset });
      setItems(prev => [...prev, ...response.data]);
      setOffset(prev => prev + 10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => <ItemCard item={item} />}
      keyExtractor={item => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={() => 
        loading && <ActivityIndicator color="#5B21B6" />
      }
    />
  );
}
```

## Pagination State Management

### Custom Hook for Pagination

```typescript
import { useState, useCallback } from 'react';

export function usePagination<T>(
  fetchFunction: (limit: number, offset: number) => Promise<{ data: T[] }>
) {
  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchFunction(10, 0);
      setItems(response.data);
      setOffset(10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Load initial failed:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetchFunction(10, offset);
      setItems(prev => [...prev, ...response.data]);
      setOffset(prev => prev + 10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, offset, loading, hasMore]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setHasMore(true);
    await loadInitial();
  }, [loadInitial]);

  return {
    items,
    loading,
    hasMore,
    loadInitial,
    loadMore,
    refresh,
  };
}
```

### Usage with Custom Hook

```typescript
import { usePagination } from '@hooks/usePagination';
import { fetchAllStudents } from '@core/services/dashboardApi';

export default function StudentsScreen() {
  const { 
    items: students, 
    loading, 
    hasMore, 
    loadInitial, 
    loadMore,
    refresh 
  } = usePagination(fetchAllStudents);

  useEffect(() => {
    loadInitial();
  }, []);

  return (
    <FlatList
      data={students}
      renderItem={({ item }) => <StudentCard student={item} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshing={loading}
      onRefresh={refresh}
      ListFooterComponent={() => 
        loading && hasMore && <ActivityIndicator />
      }
    />
  );
}
```

## Best Practices

### 1. **Check `hasMore` Before Loading**
Always check if there are more items before making API calls:
```typescript
if (!hasMore) return; // No more data to load
```

### 2. **Prevent Multiple Simultaneous Calls**
Use a loading flag to prevent multiple API calls:
```typescript
if (loading) return; // Already loading
```

### 3. **Handle Empty States**
Show appropriate messages when lists are empty:
```typescript
{items.length === 0 && !loading && (
  <Text>No items found</Text>
)}
```

### 4. **Show Loading Indicators**
Provide visual feedback during data fetching:
```typescript
{loading && <ActivityIndicator />}
```

### 5. **Error Handling**
Always handle errors gracefully:
```typescript
try {
  const data = await fetchItems();
} catch (error) {
  console.error('Failed to load:', error);
  // Show error message to user
}
```

### 6. **Combine with Search/Filters**
Reset pagination when filters change:
```typescript
const handleFilterChange = async (newFilter) => {
  setOffset(0);
  setItems([]);
  const response = await fetchItems({ ...newFilter, limit: 10, offset: 0 });
  setItems(response.data);
};
```

## API Response Format

All paginated endpoints should return:
```typescript
{
  data: T[], // Array of items
  pagination: {
    total: number,      // Total number of items
    limit: number,      // Items per page
    offset: number,     // Current offset
    hasMore: boolean    // Whether more items exist
  }
}
```

## Performance Tips

1. **Use `keyExtractor`**: Always provide unique keys for list items
2. **Optimize `renderItem`**: Memoize render functions with `React.memo`
3. **Virtual Lists**: Use `FlatList` for large lists (automatically virtualizes)
4. **Debounce**: Debounce scroll events for infinite scroll
5. **Cache**: Consider caching loaded data to avoid refetching

## Migration Checklist

- [x] Updated `fetchTeacherQuizzes` to load 10 items by default
- [x] Updated `fetchStudentQuizzes` to load 10 items by default
- [x] Updated `fetchAllStudents` with pagination parameters
- [x] Updated `fetchClassroomStudents` with pagination parameters
- [ ] Update UI components to implement "Load More" buttons
- [ ] Add loading indicators
- [ ] Add empty state handling
- [ ] Test pagination with different data sizes
- [ ] Implement custom pagination hook (optional)
- [ ] Add infinite scroll support (optional)
