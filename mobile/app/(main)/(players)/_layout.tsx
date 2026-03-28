import { Stack } from "expo-router";

export default function PlayersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Players" }} />
      <Stack.Screen name="[playerId]" options={{ headerShown: false }} />
    </Stack>
  );
}
