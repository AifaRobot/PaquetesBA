import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getNotifications,
  markAllAsRead,
  markAsRead,
} from '@/src/api/notifications';
import { useAuthStore } from '@/src/store/auth.store';
import type { Notification } from '@/src/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUERY_KEY = ['notifications'] as const;
/** Poll every 30 seconds while the app is foregrounded. */
const POLL_INTERVAL_MS = 30_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // ─── Fetch & auto-poll ─────────────────────────────────────────────────────

  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Notification[], Error>({
    queryKey: QUERY_KEY,
    queryFn: getNotifications,
    enabled: session !== null,
    refetchInterval: POLL_INTERVAL_MS,
    // Pause polling when the app is in the background to save battery
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });

  // ─── Re-fetch when app comes back to foreground ────────────────────────────

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === 'active' &&
          session !== null
        ) {
          void refetch();
        }
        appState.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [refetch, session]);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ─── Actions ────────────────────────────────────────────────────────────────

  const read = useCallback(
    async (id: string) => {
      // Optimistic update
      queryClient.setQueryData<Notification[]>(QUERY_KEY, (prev = []) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      try {
        await markAsRead(id);
      } catch {
        // Revert on failure
        await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    },
    [queryClient],
  );

  const readAll = useCallback(async () => {
    // Optimistic update
    queryClient.setQueryData<Notification[]>(QUERY_KEY, (prev = []) =>
      prev.map((n) => ({ ...n, isRead: true })),
    );
    try {
      await markAllAsRead();
    } catch {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }
  }, [queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isError,
    error,
    refetch,
    markAsRead: read,
    markAllAsRead: readAll,
  };
}
