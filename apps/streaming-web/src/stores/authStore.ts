import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  verified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => void;
}

function extractAuthPayload(data: Record<string, unknown>) {
  const payload = (data.data ?? data) as Record<string, unknown>;
  return {
    user: payload.user as User,
    token: (payload.token ?? payload.accessToken) as string,
    refreshToken: (payload.refreshToken ?? null) as string | null,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { user, token, refreshToken } = extractAuthPayload(data);
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (regData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', regData);
          const { user, token, refreshToken } = extractAuthPayload(data);
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        api.post('/auth/logout').catch(() => {});
        delete api.defaults.headers.common.Authorization;
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'stream-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common.Authorization = `Bearer ${state.token}`;
        }
      },
    },
  ),
);
