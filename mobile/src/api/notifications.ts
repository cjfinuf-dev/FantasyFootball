import client from "./client";

export const getNotifications = (unreadOnly: boolean = false, limit: number = 50) =>
  client.get("/api/notifications", { params: { unread_only: unreadOnly, limit } });

export const getUnreadCount = () =>
  client.get("/api/notifications/count");

export const markRead = (notificationId: string) =>
  client.patch(`/api/notifications/${notificationId}/read`);

export const markAllRead = () =>
  client.post("/api/notifications/read-all");

export const deleteNotification = (notificationId: string) =>
  client.delete(`/api/notifications/${notificationId}`);
