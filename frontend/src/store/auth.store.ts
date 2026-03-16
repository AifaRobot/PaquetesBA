import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import {
  getMe,
  login as apiLogin,
  registerClient as apiRegisterClient,
  registerDriver as apiRegisterDriver,
  updateFcmToken as apiUpdateFcmToken,
} from '@/src/api/auth';
import { SESSION_KEY } from '@/src/api/client';
import type {
  AuthSession,
  LoginRequest,
  RegisterClientRequest,
  RegisterDriverRequest,
} from '@/src/types';

// ─── State shape ──────────────────────────────────────────────────────────────

interface AuthState {
  /** Current session (null when logged out). */
  session: AuthSession | null;
  /** True while hydrating from SecureStore or performing an auth request. */
  isLoading: boolean;

  // ─ Actions ─────────────────────────────────────────────────────────────────
  /** Restore session from SecureStore on app start. */
  hydrate: () => Promise<void>;
  /** Authenticate with identifier (email or phone) + password. */
  login: (payload: LoginRequest) => Promise<void>;
  /** Register a new CLIENT account and auto-login. */
  registerClient: (payload: RegisterClientRequest) => Promise<void>;
  /** Register a new DRIVER account and auto-login. */
  registerDriver: (payload: RegisterDriverRequest) => Promise<void>;
  /** Clear session from memory and SecureStore. */
  logout: () => Promise<void>;
  /** Push an FCM token to the backend and persist updated user in session. */
  updateFcmToken: (fcmToken: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function persistSession(session: AuthSession): Promise<void> {
  const value = JSON.stringify(session);
  try {
    await SecureStore.setItemAsync(SESSION_KEY, value);
  } catch {
    // SecureStore not available on web — fall back to localStorage
    localStorage.setItem(SESSION_KEY, value);
  }
}

async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isLoading: true,

  // ─── hydrate ──────────────────────────────────────────────────────────────
  hydrate: async () => {
    set({ isLoading: true });
    try {
      let raw: string | null = null;
      try {
        raw = await SecureStore.getItemAsync(SESSION_KEY);
      } catch {
        raw = localStorage.getItem(SESSION_KEY);
      }
      if (raw) {
        const session: AuthSession = JSON.parse(raw);
        // Validate token is still accepted by re-fetching the user
        const user = await getMe();
        if (!user) {
          // User was deleted from DB — treat as logged out
          await clearSession().catch(() => undefined);
          set({ session: null });
          return;
        }
        const refreshed: AuthSession = { ...session, user };
        await persistSession(refreshed);
        set({ session: refreshed });
      }
    } catch {
      // Token is expired or invalid — clear it so the user sees the login screen
      await clearSession().catch(() => undefined);
      set({ session: null });
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── login ────────────────────────────────────────────────────────────────
  login: async (payload: LoginRequest) => {
    set({ isLoading: true });
    try {
      const session = await apiLogin(payload);
      await persistSession(session);
      set({ session });
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── registerClient ───────────────────────────────────────────────────────
  registerClient: async (payload: RegisterClientRequest) => {
    set({ isLoading: true });
    try {
      const session = await apiRegisterClient(payload);
      await persistSession(session);
      set({ session });
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── registerDriver ───────────────────────────────────────────────────────
  registerDriver: async (payload: RegisterDriverRequest) => {
    set({ isLoading: true });
    try {
      const session = await apiRegisterDriver(payload);
      await persistSession(session);
      set({ session });
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── logout ───────────────────────────────────────────────────────────────
  logout: async () => {
    await clearSession().catch(() => undefined);
    set({ session: null });
  },

  // ─── updateFcmToken ───────────────────────────────────────────────────────
  updateFcmToken: async (fcmToken: string) => {
    const { session } = get();
    if (!session) return;
    try {
      await apiUpdateFcmToken(fcmToken);
      const updated: AuthSession = {
        ...session,
        user: { ...session.user, fcmToken },
      };
      await persistSession(updated);
      set({ session: updated });
    } catch {
      // Non-critical — silently ignore FCM registration failures
    }
  },
}));
