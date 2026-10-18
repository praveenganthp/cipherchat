import { create } from "zustand";
import type { UserProfile } from "@cipherchat/shared";
import { apiFetch, setAccessToken, getAccessToken } from "./api";
import { cryptoManager } from "./crypto-store";

interface AuthState {
  user: UserProfile | null;
  device: {
    id: string;
    deviceName: string;
    deviceType: string;
    identityPublicKey: string;
  } | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  demoMode: boolean;

  setAuth: (user: UserProfile, device: any, token: string) => void;
  setUser: (user: UserProfile) => void;
  setDemoMode: (enabled: boolean) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  device: null,
  token: null,
  isLoading: true,
  isInitialized: false,
  demoMode: false,

  setAuth: (user, device, token) => {
    setAccessToken(token);
    set({ user, device, token, isLoading: false, isInitialized: true });
  },

  setUser: (user) => set({ user }),

  setDemoMode: (enabled) => set({ demoMode: enabled }),

  logout: async () => {
    try {
      if (!get().demoMode) {
        await apiFetch("/api/auth/logout", { method: "POST" });
      }
    } catch {
      // Continue cleanup regardless
    }
    setAccessToken(null);
    cryptoManager.clearKeys();
    set({ user: null, device: null, token: null, isLoading: false });
  },

  initializeAuth: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ isLoading: false, isInitialized: true });
      return;
    }

    try {
      const data = await apiFetch<{ user: UserProfile; device: any }>("/api/auth/me");
      set({ user: data.user, device: data.device, token, isLoading: false, isInitialized: true });
    } catch {
      setAccessToken(null);
      set({ user: null, device: null, token: null, isLoading: false, isInitialized: true });
    }
  },
}));
