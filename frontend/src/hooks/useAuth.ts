import { useCallback } from 'react';

import { useAuthStore } from '@/src/store/auth.store';
import { socketService } from '@/src/services/socket.service';
import { useTrackingStore } from '@/src/store/tracking.store';
import type {
  LoginRequest,
  RegisterClientRequest,
  RegisterDriverRequest,
  UserRole,
} from '@/src/types';

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Convenience hook that surfaces auth state and wraps actions with
 * side-effects that belong in the UI layer (socket cleanup, etc.).
 */
export function useAuth() {
  const {
    session,
    isLoading,
    login: storeLogin,
    registerClient: storeRegisterClient,
    registerDriver: storeRegisterDriver,
    logout: storeLogout,
    updateFcmToken,
    hydrate,
  } = useAuthStore();

  const clearTracking = useTrackingStore((s) => s.clearTracking);

  // ─── Derived helpers ────────────────────────────────────────────────────────

  const isAuthenticated = session !== null;
  const user = session?.user ?? null;
  const role: UserRole | null = user?.role ?? null;
  const accessToken = session?.access_token ?? null;

  const isClient = role === 'CLIENT';
  const isDriver = role === 'DRIVER';
  const isAdmin = role === 'ADMIN';

  // ─── Actions with side-effects ──────────────────────────────────────────────

  const login = useCallback(
    async (payload: LoginRequest) => {
      await storeLogin(payload);
      // After login the session is available; connect socket
      const token = useAuthStore.getState().session?.access_token;
      if (token) socketService.connect(token);
    },
    [storeLogin],
  );

  const registerClient = useCallback(
    async (payload: RegisterClientRequest) => {
      await storeRegisterClient(payload);
      const token = useAuthStore.getState().session?.access_token;
      if (token) socketService.connect(token);
    },
    [storeRegisterClient],
  );

  const registerDriver = useCallback(
    async (payload: RegisterDriverRequest) => {
      await storeRegisterDriver(payload);
      const token = useAuthStore.getState().session?.access_token;
      if (token) socketService.connect(token);
    },
    [storeRegisterDriver],
  );

  const logout = useCallback(async () => {
    socketService.disconnect();
    clearTracking();
    await storeLogout();
  }, [storeLogout, clearTracking]);

  return {
    // State
    session,
    user,
    role,
    accessToken,
    isAuthenticated,
    isLoading,
    isClient,
    isDriver,
    isAdmin,

    // Actions
    login,
    registerClient,
    registerDriver,
    logout,
    updateFcmToken,
    hydrate,
  };
}
