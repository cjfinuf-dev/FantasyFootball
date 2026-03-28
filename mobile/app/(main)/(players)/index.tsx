import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { usePlayerStore, Player } from "@/stores/playerStore";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"] as const;

const POSITION_COLORS: Record<string, string> = {
  QB: "#e74c3c",
  RB: "#27ae60",
  WR: "#2980b9",
  TE: "#f39c12",
  K: "#8e44ad",
  DEF: "#7f8c8d",
};

export default function PlayersScreen() {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<string>("ALL");
  const { searchResults, trending, loading, search: doSearch, fetchTrending } = usePlayerStore();
  const router = useRouter();

  useEffect(() => {
    fetchTrending();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      doSearch({
        search: search || undefined,
        position: position === "ALL" ? undefined : position,
        limit: 50,
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, position]);

  const handlePlayerPress = (player: Player) => {
    router.push(`/(main)/(players)/${player.id}`);
  };

  const showTrending = !search && position === "ALL" && trending.length > 0;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search players..."
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.filterRow}>
        {POSITIONS.map((pos) => (
          <TouchableOpacity
            key={pos}
            style={[styles.filterChip, position === pos && styles.filterChipActive]}
            onPress={() => setPosition(pos)}
          >
            <Text style={[styles.filterText, position === pos && styles.filterTextActive]}>{pos}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showTrending && (
        <View style={styles.trendingSection}>
          <Text style={styles.sectionTitle}>Trending Adds</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={trending.slice(0, 10)}
            keyExtractor={(item) => item.player_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.trendingCard}
                onPress={() => item.player && handlePlayerPress(item.player)}
              >
                <Text style={styles.trendingName} numberOfLines={1}>
                  {item.player?.full_name ?? item.player_id}
                </Text>
                <Text style={[styles.trendingPos, { color: POSITION_COLORS[item.player?.position ?? ""] ?? "#666" }]}>
                  {item.player?.position ?? "?"} — {item.player?.team ?? "FA"}
                </Text>
                <Text style={styles.trendingCount}>+{item.count}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {loading && searchResults.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 30 }} size="large" color="#1a73e8" />
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.playerRow} onPress={() => handlePlayerPress(item)}>
              <View style={[styles.positionBadge, { backgroundColor: POSITION_COLORS[item.position ?? ""] ?? "#ccc" }]}>
                <Text style={styles.positionText}>{item.position ?? "?"}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.full_name ?? "Unknown"}</Text>
                <Text style={styles.playerMeta}>
                  {item.team ?? "FA"}
                  {item.injury_status ? ` · ${item.injury_status}` : ""}
                  {item.age ? ` · Age ${item.age}` : ""}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>
                {search ? "No players found" : "Search for a player or select a position"}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  searchInput: {
    margin: 16, marginBottom: 8, borderWidth: 1, borderColor: "#ddd",
    borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: "#fff",
  },
  filterRow: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 8, gap: 6 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "#e9ecef" },
  filterChipActive: { backgroundColor: "#1a73e8" },
  filterText: { fontSize: 13, fontWeight: "500", color: "#555" },
  filterTextActive: { color: "#fff" },
  // Trending
  trendingSection: { paddingLeft: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  trendingCard: {
    backgroundColor: "#fff", borderRadius: 10, padding: 12, marginRight: 10,
    width: 140, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  trendingName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  trendingPos: { fontSize: 12, marginBottom: 4 },
  trendingCount: { fontSize: 12, color: "#27ae60", fontWeight: "600" },
  // Player list
  playerRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    marginHorizontal: 16, marginBottom: 2, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 8,
  },
  positionBadge: {
    width: 36, height: 36, borderRadius: 18, justifyContent: "center",
    alignItems: "center", marginRight: 12,
  },
  positionText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: "500" },
  playerMeta: { fontSize: 13, color: "#888", marginTop: 2 },
  emptyText: { textAlign: "center", color: "#999", marginTop: 40, fontSize: 15 },
});
