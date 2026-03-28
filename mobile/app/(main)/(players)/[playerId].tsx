import { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePlayerStore } from "@/stores/playerStore";

const POSITION_COLORS: Record<string, string> = {
  QB: "#e74c3c", RB: "#27ae60", WR: "#2980b9", TE: "#f39c12", K: "#8e44ad", DEF: "#7f8c8d",
};

const STAT_LABELS: Record<string, string> = {
  pass_yd: "Pass Yds", pass_td: "Pass TD", pass_int: "INT", pass_att: "Pass Att", pass_cmp: "Pass Cmp",
  rush_yd: "Rush Yds", rush_td: "Rush TD", rush_att: "Rush Att",
  rec: "Rec", rec_yd: "Rec Yds", rec_td: "Rec TD", rec_tgt: "Targets",
  fum_lost: "Fum Lost",
};

export default function PlayerDetailScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const { selectedPlayer: player, selectedPlayerStats: stats, loading, fetchPlayerDetail } = usePlayerStore();
  const router = useRouter();

  useEffect(() => {
    if (playerId) fetchPlayerDetail(playerId);
  }, [playerId]);

  if (loading || !player) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  const posColor = POSITION_COLORS[player.position ?? ""] ?? "#ccc";

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Player Header */}
      <View style={styles.header}>
        <View style={[styles.posCircle, { backgroundColor: posColor }]}>
          <Text style={styles.posText}>{player.position ?? "?"}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.playerName}>{player.full_name ?? "Unknown"}</Text>
          <Text style={styles.playerTeam}>{player.team ?? "Free Agent"}</Text>
          <View style={styles.metaRow}>
            {player.age && <Text style={styles.metaChip}>Age {player.age}</Text>}
            {player.years_exp != null && <Text style={styles.metaChip}>Exp {player.years_exp}yr</Text>}
            {player.injury_status && (
              <Text style={[styles.metaChip, styles.injuryChip]}>{player.injury_status}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Season Stats */}
      <Text style={styles.sectionTitle}>Game Log</Text>
      {stats.length === 0 ? (
        <Text style={styles.emptyText}>No stats available. Sync player data first.</Text>
      ) : (
        <View style={styles.statsTable}>
          <View style={styles.statsHeader}>
            <Text style={[styles.statsCell, styles.weekCell]}>Wk</Text>
            <Text style={styles.statsCell}>PPR</Text>
            <Text style={styles.statsCell}>Half</Text>
            <Text style={styles.statsCell}>Std</Text>
          </View>
          {stats.slice(0, 18).map((s) => (
            <View key={`${s.season}-${s.week}`} style={styles.statsRow}>
              <Text style={[styles.statsCell, styles.weekCell]}>W{s.week}</Text>
              <Text style={[styles.statsCell, styles.pointsCell]}>{s.points_ppr?.toFixed(1) ?? "—"}</Text>
              <Text style={styles.statsCell}>{s.points_half?.toFixed(1) ?? "—"}</Text>
              <Text style={styles.statsCell}>{s.points_std?.toFixed(1) ?? "—"}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Stat Breakdown for most recent week */}
      {stats.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Week {stats[0].week} Breakdown</Text>
          <View style={styles.breakdownGrid}>
            {Object.entries(stats[0].stats)
              .filter(([key]) => STAT_LABELS[key])
              .filter(([, val]) => val !== 0)
              .map(([key, val]) => (
                <View key={key} style={styles.breakdownItem}>
                  <Text style={styles.breakdownValue}>{typeof val === "number" ? val.toFixed(val % 1 === 0 ? 0 : 1) : val}</Text>
                  <Text style={styles.breakdownLabel}>{STAT_LABELS[key]}</Text>
                </View>
              ))}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { padding: 16, paddingBottom: 0 },
  backText: { color: "#1a73e8", fontSize: 16 },
  // Header
  header: { flexDirection: "row", padding: 16, alignItems: "center" },
  posCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginRight: 16 },
  posText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  headerInfo: { flex: 1 },
  playerName: { fontSize: 22, fontWeight: "bold" },
  playerTeam: { fontSize: 16, color: "#666", marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  metaChip: { backgroundColor: "#e9ecef", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, fontSize: 12, color: "#555", overflow: "hidden" },
  injuryChip: { backgroundColor: "#fde8e8", color: "#c0392b" },
  // Stats table
  sectionTitle: { fontSize: 18, fontWeight: "bold", paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  emptyText: { paddingHorizontal: 16, color: "#999" },
  statsTable: { marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 10, overflow: "hidden" },
  statsHeader: { flexDirection: "row", backgroundColor: "#f0f0f0", paddingVertical: 8 },
  statsRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#f5f5f5" },
  statsCell: { flex: 1, textAlign: "center", fontSize: 14 },
  weekCell: { flex: 0.7, fontWeight: "500" },
  pointsCell: { fontWeight: "600", color: "#1a73e8" },
  // Breakdown
  breakdownGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8 },
  breakdownItem: { backgroundColor: "#fff", borderRadius: 8, padding: 12, width: "30%", alignItems: "center" },
  breakdownValue: { fontSize: 20, fontWeight: "bold", color: "#333" },
  breakdownLabel: { fontSize: 11, color: "#888", marginTop: 2 },
});
