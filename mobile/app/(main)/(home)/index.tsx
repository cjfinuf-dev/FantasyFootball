import { useCallback, useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useLeagueStore, League } from "@/stores/leagueStore";
import { createLeague, joinLeagueByCode, LeagueCreateData } from "@/api/leagues";

export default function HomeScreen() {
  const { leagues, loading, fetchLeagues } = useLeagueStore();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchLeagues();
    }, [])
  );

  const handleLeaguePress = (league: League) => {
    useLeagueStore.getState().setCurrentLeague(league);
    router.push(`/(main)/(league)/${league.id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Leagues</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.headerBtnText}>+ Create</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerBtn, styles.headerBtnOutline]} onPress={() => setShowJoin(true)}>
            <Text style={styles.headerBtnOutlineText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && leagues.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1a73e8" />
      ) : leagues.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No leagues yet</Text>
          <Text style={styles.emptySubtext}>Create a league or join one with an invite code</Text>
        </View>
      ) : (
        <FlatList
          data={leagues}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLeagues} />}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.leagueCard} onPress={() => handleLeaguePress(item)}>
              <View style={styles.leagueCardHeader}>
                <Text style={styles.leagueName}>{item.name}</Text>
                <Text style={styles.leagueStatus}>{item.status.replace("_", " ")}</Text>
              </View>
              <Text style={styles.leagueMeta}>
                {item.season} &middot; {item.num_teams} teams &middot; {item.scoring_type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <CreateLeagueModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchLeagues} />
      <JoinLeagueModal visible={showJoin} onClose={() => setShowJoin(false)} onJoined={fetchLeagues} />
    </View>
  );
}

function CreateLeagueModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [numTeams, setNumTeams] = useState("12");
  const [scoringType, setScoringType] = useState("ppr");
  const [saving, setSaving] = useState(false);

  const scoringOptions = ["ppr", "half_ppr", "standard"];

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter a league name.");
      return;
    }
    setSaving(true);
    try {
      const data: LeagueCreateData = {
        name: name.trim(),
        num_teams: parseInt(numTeams) || 12,
        scoring_type: scoringType,
      };
      await createLeague(data);
      onCreated();
      onClose();
      setName("");
      setNumTeams("12");
      setScoringType("ppr");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail ?? "Failed to create league.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create League</Text>

          <Text style={styles.label}>League Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. The Champion's League" />

          <Text style={styles.label}>Number of Teams</Text>
          <View style={styles.chipRow}>
            {["8", "10", "12", "14"].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, numTeams === n && styles.chipActive]}
                onPress={() => setNumTeams(n)}
              >
                <Text style={[styles.chipText, numTeams === n && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Scoring</Text>
          <View style={styles.chipRow}>
            {scoringOptions.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, scoringType === s && styles.chipActive]}
                onPress={() => setScoringType(s)}
              >
                <Text style={[styles.chipText, scoringType === s && styles.chipTextActive]}>
                  {s === "half_ppr" ? "Half PPR" : s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.createBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function JoinLeagueModal({ visible, onClose, onJoined }: { visible: boolean; onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) {
      Alert.alert("Missing Code", "Please enter an invite code.");
      return;
    }
    setJoining(true);
    try {
      await joinLeagueByCode(code.trim().toUpperCase());
      onJoined();
      onClose();
      setCode("");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail ?? "Failed to join league.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Join League</Text>
          <Text style={styles.label}>Invite Code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter invite code"
            autoCapitalize="characters"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.createBtn, joining && { opacity: 0.6 }]} onPress={handleJoin} disabled={joining}>
              {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.createText}>Join</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { backgroundColor: "#1a73e8", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  headerBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  headerBtnOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#1a73e8" },
  headerBtnOutlineText: { color: "#1a73e8", fontWeight: "600", fontSize: 14 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { fontSize: 20, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#999", textAlign: "center" },
  leagueCard: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  leagueCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  leagueName: { fontSize: 18, fontWeight: "600" },
  leagueStatus: { fontSize: 12, color: "#1a73e8", fontWeight: "500", textTransform: "capitalize" },
  leagueMeta: { fontSize: 14, color: "#666" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 14, fontSize: 16 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  chipActive: { backgroundColor: "#1a73e8", borderColor: "#1a73e8" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 14, alignItems: "center" },
  cancelText: { color: "#666", fontWeight: "600" },
  createBtn: { flex: 1, backgroundColor: "#1a73e8", borderRadius: 8, padding: 14, alignItems: "center" },
  createText: { color: "#fff", fontWeight: "600" },
});
