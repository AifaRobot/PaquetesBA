import { api } from './client';
import type { CreateZoneRequest, UpdateZoneRequest, Zone } from '@/src/types';

/**
 * List all zones (public — no auth required).
 */
export async function getZones(): Promise<Zone[]> {
  return api.get<Zone[]>('/zones');
}

/**
 * Create a new zone (ADMIN only).
 */
export async function createZone(payload: CreateZoneRequest): Promise<Zone> {
  return api.post<Zone>('/zones', payload);
}

/**
 * Update an existing zone (ADMIN only).
 */
export async function updateZone(
  id: string,
  payload: UpdateZoneRequest,
): Promise<Zone> {
  return api.patch<Zone>(`/zones/${id}`, payload);
}

/**
 * Delete a zone (ADMIN only).
 */
export async function deleteZone(id: string): Promise<void> {
  await api.delete<void>(`/zones/${id}`);
}
