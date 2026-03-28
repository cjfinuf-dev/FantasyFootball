import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as ExpoNotifications from "expo-notifications";
import { Platform } from "react-native";
import { loginApi, registerApi } from "@/api/auth";
import client from "@/api/client";

async function registerPushToken() {
  try {
    const { status } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== "granted") {
      const { status: newStatus } = await ExpoNotifications.requestPermissionsAsync();
      finalStatus = newStatus;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await ExpoNotifications.getExpoPushTokenAsync();
    await client.put("/api/users/me/push-token", { push_token: tokenData.data });
  } catch {
    // Push registration is best-effort
  }
}

interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,
  hydrated: false,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("access_token");
    const userStr = await SecureStore.getItemAsync("user");
    set({ token, user: userStr ? JSON.parse(userStr) : null, hydrated: true });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await loginApi(email, password);
      await SecureStore.setItemAsync("access_token", data.access_token);
      await SecureStore.setItemAsync("refresh_token", data.refresh_token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));
      set({ token: data.access_token, user: data.user, loading: false });
      registerPushToken();
    } catch (err: any) {
      const message = err.response?.data?.detail ?? "Login failed. Please try again.";
      set({ loading: false, error: message });
      throw err;
    }
  },

  register: async (email, username, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await registerApi(email, username, password);
      await SecureStore.setItemAsync("access_token", data.access_token);
      await SecureStore.setItemAsync("refresh_token", data.refresh_token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));
      set({ token: data.access_token, user: data.user, loading: false });
      registerPushToken();
    } catch (err: any) {
      const message = err.response?.data?.detail ?? "Registration failed. Please try again.";
      set({ loading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("user");
    set({ token: null, user: null });
  },

  clearError: () => set({ error: null }),
}));
