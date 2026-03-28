import { create } from "zustand";
import * as notifApi from "../api/notifications";

interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async (unreadOnly) => {
    set({ loading: true, error: null });
    try {
      const { data } = await notifApi.getNotifications(unreadOnly ?? false);
      set({ notifications: data, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail ?? "Failed to load notifications", loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await notifApi.getUnreadCount();
      set({ unreadCount: data.unread });
    } catch {
      // silent
    }
  },

  markRead: async (id) => {
    try {
      await notifApi.markRead(id);
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch {
      // silent
    }
  },

  markAllRead: async () => {
    try {
      await notifApi.markAllRead();
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // silent
    }
  },

  deleteNotification: async (id) => {
    try {
      await notifApi.deleteNotification(id);
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: s.notifications.find((n) => n.id === id && !n.is_read)
          ? s.unreadCount - 1
          : s.unreadCount,
      }));
    } catch {
      // silent
    }
  },

  reset: () => set({ notifications: [], unreadCount: 0, loading: false, error: null }),
}));
