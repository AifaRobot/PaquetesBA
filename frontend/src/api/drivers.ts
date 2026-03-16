import { api } from './client';
import type {
  DriverProfile,
  DriverStats,
  DriversQuery,
  PaginatedResponse,
  UpdateDriverProfileRequest,
  UpdateLocationRequest,
  User,
} from '@/src/types';

export interface DriverProfileWithUser extends DriverProfile {
  user: Omit<User, 'password'>;
}

/**
 * List all drivers (ADMIN only, paginated).
 * Optionally filter by zoneId or isOnline status.
 */
export async function getDrivers(
  query?: DriversQuery,
): Promise<PaginatedResponse<DriverProfileWithUser>> {
  const params = new URLSearchParams();
  if (query?.zoneId) params.set('zoneId', query.zoneId);
  if (query?.isOnline !== undefined)
    params.set('isOnline', String(query.isOnline));
  if (query?.page !== undefined) params.set('page', String(query.page));
  if (query?.limit !== undefined) params.set('limit', String(query.limit));
  const qs = params.toString();
  return api.get<PaginatedResponse<DriverProfileWithUser>>(
    `/drivers${qs ? `?${qs}` : ''}`,
  );
}

/**
 * Get online drivers available for assignment.
 * Optionally filter by zoneId.
 */
export async function getAvailableDrivers(zoneId?: string): Promise<DriverProfileWithUser[]> {
  const qs = zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : '';
  return api.get<DriverProfileWithUser[]>(`/drivers/available${qs}`);
}

/**
 * Get the authenticated driver's own profile (DRIVER only).
 */
export async function getMyProfile(): Promise<DriverProfile> {
  return api.get<DriverProfile>('/drivers/me/profile');
}

/**
 * Get the authenticated driver's performance statistics.
 */
export async function getMyStats(): Promise<DriverStats> {
  return api.get<DriverStats>('/drivers/me/stats');
}

/**
 * Update the authenticated driver's profile details.
 */
export async function updateMyProfile(
  payload: UpdateDriverProfileRequest,
): Promise<DriverProfile> {
  return api.patch<DriverProfile>('/drivers/me/profile', payload);
}

/**
 * Mark the driver as online and available for pickups.
 */
export async function goOnline(): Promise<void> {
  await api.post<void>('/drivers/me/online');
}

/**
 * Mark the driver as offline.
 */
export async function goOffline(): Promise<void> {
  await api.post<void>('/drivers/me/offline');
}

/**
 * Push a GPS location update to the server.
 * Called both from the foreground (via WebSocket) and background task (via REST).
 */
export async function updateLocation(
  payload: UpdateLocationRequest,
): Promise<void> {
  await api.patch<void>('/drivers/me/location', payload);
}
