import { useEffect } from "react";
import { View, Text } from "react-native";
import { Tabs } from "expo-router";
import { useNotificationStore } from "@/stores/notificationStore";

export default function MainLayout() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(home)" options={{ title: "Home", tabBarIcon: () => null }} />
      <Tabs.Screen name="(league)" options={{ title: "League", tabBarIcon: () => null }} />
      <Tabs.Screen name="(players)" options={{ title: "Players", tabBarIcon: () => null }} />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: "Profile",
          tabBarIcon: () => null,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </Tabs>
  );
}
