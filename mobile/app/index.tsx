import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const token = useAuthStore((s) => s.token);
  return <Redirect href={token ? "/(main)/(home)" : "/(auth)/login"} />;
}
