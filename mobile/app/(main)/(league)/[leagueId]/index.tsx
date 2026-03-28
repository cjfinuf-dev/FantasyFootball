import { View, Text, StyleSheet } from "react-native";

export default function MatchupsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Matchups will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholder: { fontSize: 16, color: "#999" },
});
