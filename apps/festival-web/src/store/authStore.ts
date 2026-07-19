import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

import type { User, LoginCredentials, RegisterData } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,

        login: async (credentials: LoginCredentials) => {
          try {
            set({ isLoading: true });

            const response = await authService.login(credentials);

            if (response.success && response.data) {
              const { user, token } = response.data;

              set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
              });

              // Set token in axios headers
              authService.setAuthToken(token);

              toast.success(`Welcome back, ${user.username}!`);
            } else {
              throw new Error(response.message || 'Login failed');
            }
          } catch (error: any) {
            set({ isLoading: false });
            const errorMessage = error?.response?.data?.message || error.message || 'Login failed';
            toast.error(errorMessage);
            throw error;
          }
        },

        register: async (data: RegisterData) => {
          try {
            set({ isLoading: true });

            const response = await authService.register(data);

            if (response.success && response.data) {
              const { user, token } = response.data;

              set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
              });

              // Set token in axios headers
              authService.setAuthToken(token);

              toast.success(`Welcome to FestScout, ${user.username}!`);
            } else {
              throw new Error(response.message || 'Registration failed');
            }
          } catch (error: any) {
            set({ isLoading: false });
            const errorMessage = error?.response?.data?.message || error.message || 'Registration failed';
            toast.error(errorMessage);
            throw error;
          }
        },

        logout: () => {
          // Clear auth state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });

          // Clear token from axios headers
          authService.removeAuthToken();

          // Clear persisted storage
          localStorage.removeItem('auth-storage');

          toast.success('You have been logged out');
        },

        refreshUser: async () => {
          try {
            const { token } = get();

            if (!token) {
              throw new Error('No token available');
            }

            set({ isLoading: true });

            const response = await authService.getCurrentUser();

            if (response.success && response.data) {
              set({
                user: response.data.user,
                isLoading: false,
              });
            } else {
              throw new Error('Failed to refresh user data');
            }
          } catch (error: any) {
            console.error('Failed to refresh user:', error);

            // If refresh fails, logout the user
            get().logout();

            set({ isLoading: false });
          }
        },

        clearAuth: () => {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          // Set token in axios headers on app load if token exists
          if (state?.token) {
            authService.setAuthToken(state.token);
          }
        },
      }
    ),
    { name: 'auth-store' }
  )
);