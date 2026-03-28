import { useAuthStore } from "@/stores/authStore";

export const useAuth = () => {
  const { token, user, login, register, logout } = useAuthStore();
  return { isAuthenticated: !!token, user, login, register, logout };
};
