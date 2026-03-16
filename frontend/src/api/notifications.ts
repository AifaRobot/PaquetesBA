import { api } from './client';
import type { Notification } from '@/src/types';

/**
 * Fetch all notifications for the authenticated user.
 * Returns newest first.
 */
export async function getNotifications(): Promise<Notification[]> {
  return api.get<Notification[]>('/notifications');
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(id: string): Promise<Notification> {
  return api.patch<Notification>(`/notifications/${id}/read`);
}

/**
 * Mark all notifications as read for the authenticated user.
 */
export async function markAllAsRead(): Promise<void> {
  await api.post<void>('/notifications/read-all');
}
