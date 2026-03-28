import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { updateProfileApi } from "@/api/auth";

const NOTIF_ICONS: Record<string, string> = {
  trade_proposed: "T",
  trade_accepted: "T",
  trade_rejected: "T",
  trade_vetoed: "T",
  waiver_won: "W",
  waiver_lost: "W",
  draft_starting: "D",
  draft_your_pick: "D",
  draft_complete: "D",
  matchup_final: "M",
  chat_mention: "C",
  league_joined: "L",
};

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const {
    notifications, unreadCount, loading,
    fetchNotifications, markRead, markAllRead, deleteNotification,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("Invalid", "Username cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateProfileApi({ username: username.trim() });
      await useAuthStore.getState().hydrate();
      setEditing(false);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  if (showNotifs) {
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setShowNotifs(false)}>
            <Text style={{ color: "#1a73e8", fontSize: 16 }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>Notifications</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={{ color: "#1a73e8", fontSize: 14 }}>Read All</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 60 }} />}
        </View>

        {loading && <ActivityIndicator color="#1a73e8" />}

        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          style={{ width: "100%" }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[nStyles.row, !item.is_read && nStyles.unread]}
              onPress={() => { if (!item.is_read) markRead(item.id); }}
              onLongPress={() => {
                Alert.alert("Delete Notification?", item.title, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteNotification(item.id) },
                ]);
              }}
            >
              <View style={nStyles.iconCircle}>
                <Text style={nStyles.iconText}>{NOTIF_ICONS[item.type] ?? "N"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={nStyles.title}>{item.title}</Text>
                {item.body && <Text style={nStyles.body}>{item.body}</Text>}
                <Text style={nStyles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              {!item.is_read && <View style={nStyles.dot} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{ color: "#999", textAlign: "center", marginTop: 40 }}>No notifications</Text>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(user?.username?.[0] ?? "?").toUpperCase()}</Text>
      </View>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput style={styles.editInput} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEditing(false); setUsername(user?.username ?? ""); }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setEditing(true)}>
          <Text style={styles.username}>{user?.username ?? "Unknown"}</Text>
          <Text style={styles.editHint}>Tap to edit</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.email}>{user?.email ?? ""}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.sectionRow}
          onPress={() => { setShowNotifs(true); fetchNotifications(); }}
        >
          <Text style={styles.sectionItem}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={nStyles.badge}><Text style={nStyles.badgeText}>{unreadCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const nStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  unread: { backgroundColor: "#f0f4ff" },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e3eaf5", justifyContent: "center", alignItems: "center", marginRight: 12 },
  iconText: { fontSize: 14, fontWeight: "bold", color: "#1a73e8" },
  title: { fontSize: 15, fontWeight: "600" },
  body: { fontSize: 13, color: "#666", marginTop: 2 },
  time: { fontSize: 11, color: "#aaa", marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1a73e8" },
  badge: { backgroundColor: "#e53935", borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
});

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: 60, backgroundColor: "#fff", paddingHorizontal: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1a73e8", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  avatarText: { fontSize: 32, color: "#fff", fontWeight: "bold" },
  username: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  editHint: { fontSize: 12, color: "#999", textAlign: "center", marginTop: 2 },
  email: { fontSize: 16, color: "#666", marginTop: 4, marginBottom: 32 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  editInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 6, padding: 8, fontSize: 18, minWidth: 150 },
  saveButton: { backgroundColor: "#1a73e8", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 16 },
  saveText: { color: "#fff", fontWeight: "600" },
  cancelText: { color: "#999", marginLeft: 8 },
  section: { width: "100%", marginBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase", marginBottom: 8 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  sectionItem: { fontSize: 16 },
  logoutButton: { backgroundColor: "#e53935", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, marginTop: "auto", marginBottom: 40 },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
