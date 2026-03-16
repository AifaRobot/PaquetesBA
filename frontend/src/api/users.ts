import { api } from './client';
import type {
  Address,
  CreateAddressRequest,
  PaginatedResponse,
  PaginationQuery,
  UpdateProfileRequest,
  UpdateUserStatusRequest,
  User,
} from '@/src/types';

/**
 * List all users (ADMIN only, paginated).
 */
export async function getUsers(
  query?: PaginationQuery,
): Promise<PaginatedResponse<User>> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) params.set('page', String(query.page));
  if (query?.limit !== undefined) params.set('limit', String(query.limit));
  const qs = params.toString();
  return api.get<PaginatedResponse<User>>(`/users${qs ? `?${qs}` : ''}`);
}

/**
 * Get a single user by ID (ADMIN only).
 */
export async function getUser(id: string): Promise<User> {
  return api.get<User>(`/users/${id}`);
}

/**
 * Update the authenticated user's own profile.
 */
export async function updateProfile(payload: UpdateProfileRequest): Promise<User> {
  return api.patch<User>('/users/me/profile', payload);
}

/**
 * Change a user's account status (ADMIN only).
 * Use this to suspend or reactivate accounts.
 */
export async function updateUserStatus(
  id: string,
  payload: UpdateUserStatusRequest,
): Promise<User> {
  return api.patch<User>(`/users/${id}/status`, payload);
}

/**
 * Get all saved addresses for the authenticated user.
 */
export async function getAddresses(): Promise<Address[]> {
  return api.get<Address[]>('/users/me/addresses');
}

/**
 * Add a new saved address for the authenticated user.
 */
export async function createAddress(
  payload: CreateAddressRequest,
): Promise<Address> {
  return api.patch<Address>('/users/me/addresses', payload);
}

/**
 * Delete a saved address by ID.
 */
export async function deleteAddress(id: string): Promise<void> {
  await api.delete<void>(`/users/me/addresses/${id}`);
}
