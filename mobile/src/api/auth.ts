import client from "./client";

export const loginApi = (email: string, password: string) =>
  client.post("/api/auth/login", { email, password });

export const registerApi = (email: string, username: string, password: string) =>
  client.post("/api/auth/register", { email, username, password });

export const refreshApi = (refreshToken: string) =>
  client.post("/api/auth/refresh", { refresh_token: refreshToken });

export const getMeApi = () => client.get("/api/users/me");

export const updateProfileApi = (data: { username?: string; avatar_url?: string }) =>
  client.patch("/api/users/me", data);

export const setPushTokenApi = (pushToken: string) =>
  client.put("/api/users/me/push-token", { push_token: pushToken });
