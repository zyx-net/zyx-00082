import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(username, password);
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.token);
        set({
          user: response.data.user,
          token: response.data.token,
          isLoading: false,
        });
        return true;
      }
      return false;
    } catch (e) {
      set({
        error: (e as Error).message,
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      set({ user: null, token: null, error: null });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null });
      return false;
    }

    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        set({ user: response.data, token });
        return true;
      }
      localStorage.removeItem('token');
      set({ user: null, token: null });
      return false;
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
