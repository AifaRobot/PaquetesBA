import { api } from './client';
import type {
  CreateRateRequest,
  PackageSize,
  PackageType,
  Rate,
  RateEstimateResponse,
  UpdateRateRequest,
} from '@/src/types';

/**
 * List all rates (ADMIN only).
 */
export async function getRates(): Promise<Rate[]> {
  return api.get<Rate[]>('/rates');
}

/**
 * Estimate shipping cost for given parameters (public).
 */
export async function estimateRate(params: {
  zoneId: string;
  packageSize: PackageSize;
  packageType: PackageType;
  distanceKm: number;
}): Promise<RateEstimateResponse> {
  const query = new URLSearchParams({
    zoneId: params.zoneId,
    packageSize: params.packageSize,
    packageType: params.packageType,
    distanceKm: String(params.distanceKm),
  });
  return api.get<RateEstimateResponse>(`/rates/estimate?${query.toString()}`);
}

/**
 * Create a new rate entry (ADMIN only).
 */
export async function createRate(payload: CreateRateRequest): Promise<Rate> {
  return api.post<Rate>('/rates', payload);
}

/**
 * Update an existing rate (ADMIN only).
 */
export async function updateRate(
  id: string,
  payload: UpdateRateRequest,
): Promise<Rate> {
  return api.patch<Rate>(`/rates/${id}`, payload);
}

/**
 * Delete a rate (ADMIN only).
 */
export async function deleteRate(id: string): Promise<void> {
  await api.delete<void>(`/rates/${id}`);
}
