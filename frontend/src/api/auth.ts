import { api } from './client';
import type {
  AuthSession,
  LoginRequest,
  RegisterClientRequest,
  RegisterDriverRequest,
  User,
} from '@/src/types';

/**
 * Authenticate with email/phone + password.
 * Returns an AuthSession containing access_token and user object.
 */
export async function login(payload: LoginRequest): Promise<AuthSession> {
  return api.post<AuthSession>('/auth/login', payload);
}

/**
 * Register a new CLIENT account.
 */
export async function registerClient(
  payload: RegisterClientRequest,
): Promise<AuthSession> {
  return api.post<AuthSession>('/auth/register/client', payload);
}

/**
 * Register a new DRIVER account.
 */
export async function registerDriver(
  payload: RegisterDriverRequest,
): Promise<AuthSession> {
  return api.post<AuthSession>('/auth/register/driver', payload);
}

/**
 * Fetch the currently authenticated user.
 * Requires a valid JWT in SecureStore.
 */
export async function getMe(): Promise<User> {
  return api.get<User>('/auth/me');
}

/**
 * Register or refresh the FCM push-notification token for this device.
 */
export async function updateFcmToken(fcmToken: string): Promise<void> {
  await api.patch<void>('/auth/fcm-token', { fcmToken });
}
