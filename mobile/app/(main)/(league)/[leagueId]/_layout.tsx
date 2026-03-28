import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, TextInput, FlatList, ActivityIndicator, Alert } from "react-native";
import { Slot, useLocalSearchParams, useRouter } from "expo-router";
import { useLeagueStore } from "@/stores/leagueStore";
import { useDraftStore, DraftPick, DraftMember } from "@/stores/draftStore";
import { useRosterStore } from "@/stores/rosterStore";
import { useMatchupStore } from "@/stores/matchupStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useChatStore } from "@/stores/chatStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import * as SecureStore from "expo-secure-store";

const TABS = [
  { key: "matchups", label: "Matchups" },
  { key: "draft", label: "Draft" },
  { key: "roster", label: "Roster" },
  { key: "standings", label: "Standings" },
  { key: "transactions", label: "Moves" },
  { key: "members", label: "Members" },
  { key: "chat", label: "Chat" },
  { key: "settings", label: "Settings" },
] as const;

export default function LeagueDetailLayout() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { currentLeague, fetchLeague, fetchMembers } = useLeagueStore();
  const [activeTab, setActiveTab] = useState("matchups");
  const router = useRouter();

  useEffect(() => {
    if (leagueId) {
      fetchLeague(leagueId);
      fetchMembers(leagueId);
    }
  }, [leagueId]);

  const handleShare = async () => {
    if (currentLeague?.invite_code) {
      await Share.share({ message: `Join my fantasy football league! Invite code: ${currentLeague.invite_code}` });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.leagueName} numberOfLines={1}>{currentLeague?.name ?? "League"}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <LeagueTabContent tab={activeTab} leagueId={leagueId!} />
    </View>
  );
}

function LeagueTabContent({ tab, leagueId }: { tab: string; leagueId: string }) {
  switch (tab) {
    case "matchups":
      return <MatchupsTab leagueId={leagueId} />;
    case "draft":
      return <DraftTab leagueId={leagueId} />;
    case "roster":
      return <RosterTab leagueId={leagueId} />;
    case "standings":
      return <StandingsTab leagueId={leagueId} />;
    case "transactions":
      return <TransactionsTab leagueId={leagueId} />;
    case "members":
      return <MembersTab leagueId={leagueId} />;
    case "chat":
      return <ChatTab leagueId={leagueId} />;
    case "settings":
      return <SettingsTab leagueId={leagueId} />;
    default:
      return (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{tab.charAt(0).toUpperCase() + tab.slice(1)} — coming soon</Text>
        </View>
      );
  }
}

function MembersTab({ leagueId }: { leagueId: string }) {
  const { members, currentLeague } = useLeagueStore();

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>
        Members ({members.length}/{currentLeague?.num_teams ?? "?"})
      </Text>
      {members.map((m) => (
        <View key={m.id} style={styles.memberRow}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>{(m.username?.[0] ?? "?").toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.team_name ?? m.username}</Text>
            <Text style={styles.memberUsername}>@{m.username}</Text>
          </View>
          {m.role === "commissioner" && (
            <Text style={styles.commBadge}>Commish</Text>
          )}
        </View>
      ))}
      {currentLeague?.invite_code && (
        <View style={styles.inviteBox}>
          <Text style={styles.inviteLabel}>Invite Code</Text>
          <Text style={styles.inviteCode}>{currentLeague.invite_code}</Text>
        </View>
      )}
    </View>
  );
}

function StandingsTab({ leagueId }: { leagueId: string }) {
  const { members } = useLeagueStore();

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Standings</Text>
      {members.length === 0 ? (
        <Text style={styles.placeholderText}>No members yet</Text>
      ) : (
        <View>
          <View style={styles.standingsHeader}>
            <Text style={[styles.standingsCol, { flex: 2 }]}>Team</Text>
            <Text style={styles.standingsCol}>W</Text>
            <Text style={styles.standingsCol}>L</Text>
            <Text style={styles.standingsCol}>PF</Text>
          </View>
          {members.map((m, i) => (
            <View key={m.id} style={styles.standingsRow}>
              <Text style={[styles.standingsCol, { flex: 2 }]}>{i + 1}. {m.team_name ?? m.username}</Text>
              <Text style={styles.standingsCol}>0</Text>
              <Text style={styles.standingsCol}>0</Text>
              <Text style={styles.standingsCol}>0</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SettingsTab({ leagueId }: { leagueId: string }) {
  const { currentLeague } = useLeagueStore();
  const router = useRouter();

  if (!currentLeague) return null;

  const settings = [
    { label: "Season", value: String(currentLeague.season) },
    { label: "Teams", value: String(currentLeague.num_teams) },
    { label: "Scoring", value: currentLeague.scoring_type.toUpperCase() },
    { label: "Waivers", value: currentLeague.waiver_type.toUpperCase() },
    { label: "FAAB Budget", value: `$${currentLeague.faab_budget}` },
    { label: "Playoff Teams", value: String(currentLeague.playoff_teams) },
    { label: "Status", value: currentLeague.status.replace("_", " ") },
  ];

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>League Settings</Text>
      {settings.map((s) => (
        <View key={s.label} style={styles.settingRow}>
          <Text style={styles.settingLabel}>{s.label}</Text>
          <Text style={styles.settingValue}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Chat Tab ────────────────────────────────────────────────────────

function ChatTab({ leagueId }: { leagueId: string }) {
  const {
    messages, loading, hasMore, typingUsers, error,
    fetchMessages, appendMessage, updateReactions, setTypingUser, reset,
  } = useChatStore();

  const { lastMessage: wsMsg, connected, send } = useWebSocket(`/ws/chat/${leagueId}`);
  const [input, setInput] = useState("");
  const authed = useRef(false);

  // Auth on WS connect
  useEffect(() => {
    if (connected && !authed.current) {
      (async () => {
        const token = await SecureStore.getItemAsync("access_token");
        if (token) {
          send({ action: "auth", token });
          authed.current = true;
        }
      })();
    }
  }, [connected]);

  // Handle WS messages
  useEffect(() => {
    if (!wsMsg) return;
    if (wsMsg.type === "message") appendMessage(wsMsg);
    else if (wsMsg.type === "reaction") updateReactions(wsMsg.message_id, wsMsg.reactions);
    else if (wsMsg.type === "typing") setTypingUser(wsMsg.username);
  }, [wsMsg]);

  // Load initial messages
  useEffect(() => { fetchMessages(leagueId); return () => { reset(); authed.current = false; }; }, [leagueId]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    send({ action: "message", content: text });
    setInput("");
  };

  const handleTyping = () => {
    send({ action: "typing" });
  };

  const loadMore = () => {
    if (!hasMore || loading || messages.length === 0) return;
    const oldest = messages[messages.length - 1];
    fetchMessages(leagueId, oldest.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => {
          const isPoll = item.message_type === "poll";
          return (
            <View style={chatStyles.msgRow}>
              <View style={chatStyles.avatar}>
                <Text style={chatStyles.avatarText}>{(item.username?.[0] ?? "?").toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <Text style={chatStyles.username}>{item.username ?? "Unknown"}</Text>
                  <Text style={chatStyles.time}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <Text style={chatStyles.content}>{item.content}</Text>

                {/* Poll options */}
                {isPoll && item.metadata_?.options && (
                  <View style={{ marginTop: 6 }}>
                    {(item.metadata_.options as string[]).map((opt, i) => {
                      const counts = item.metadata_?.vote_counts ?? [];
                      const total = counts.reduce((a: number, b: number) => a + b, 0);
                      const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={chatStyles.pollOption}
                          onPress={() => useChatStore.getState().votePoll(leagueId, item.id, i)}
                        >
                          <Text style={{ fontSize: 14 }}>{opt}</Text>
                          <Text style={{ fontSize: 12, color: "#999" }}>{counts[i] ?? 0} ({pct}%)</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Reactions */}
                {Object.keys(item.reactions).length > 0 && (
                  <View style={chatStyles.reactionsRow}>
                    {Object.entries(item.reactions).map(([emoji, count]) => (
                      <TouchableOpacity
                        key={emoji}
                        style={chatStyles.reactionBubble}
                        onPress={() => send({ action: "react", message_id: item.id, emoji })}
                      >
                        <Text style={{ fontSize: 13 }}>{emoji} {count}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          loading ? <ActivityIndicator color="#1a73e8" /> : <Text style={{ color: "#999", textAlign: "center", marginTop: 40 }}>No messages yet. Say something!</Text>
        }
      />

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <Text style={chatStyles.typing}>
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </Text>
      )}

      {/* Input bar */}
      <View style={chatStyles.inputBar}>
        <TextInput
          style={chatStyles.input}
          placeholder="Message..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={(t) => { setInput(t); handleTyping(); }}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={chatStyles.sendBtn} onPress={handleSend}>
          <Text style={chatStyles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>

      {!connected && (
        <View style={chatStyles.offlineBanner}>
          <Text style={{ color: "#fff", fontSize: 12 }}>Reconnecting...</Text>
        </View>
      )}
      {error && <Text style={{ color: "red", textAlign: "center", padding: 4, fontSize: 12 }}>{error}</Text>}
    </View>
  );
}

const chatStyles = StyleSheet.create({
  msgRow: { flexDirection: "row", marginBottom: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e3eaf5", justifyContent: "center", alignItems: "center", marginRight: 10, marginTop: 2 },
  avatarText: { fontSize: 14, fontWeight: "bold", color: "#1a73e8" },
  username: { fontSize: 14, fontWeight: "600", marginRight: 6 },
  time: { fontSize: 11, color: "#aaa" },
  content: { fontSize: 15, color: "#333", marginTop: 2 },
  reactionsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, gap: 4 },
  reactionBubble: { backgroundColor: "#f0f0f0", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  pollOption: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f0f4ff", borderRadius: 8, padding: 10, marginBottom: 4 },
  typing: { paddingHorizontal: 16, paddingVertical: 4, fontSize: 12, color: "#999", fontStyle: "italic" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: "#eee", backgroundColor: "#fff" },
  input: { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { marginLeft: 8, backgroundColor: "#1a73e8", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  offlineBanner: { backgroundColor: "#d9534f", alignItems: "center", paddingVertical: 4 },
});

// ─── Transactions Tab ────────────────────────────────────────────────

const TXN_STATUS_COLORS: Record<string, string> = {
  pending: "#f0ad4e",
  completed: "#5cb85c",
  rejected: "#d9534f",
  cancelled: "#999",
  vetoed: "#d9534f",
};

function TransactionsTab({ leagueId }: { leagueId: string }) {
  const { transactions, loading, error, fetchTransactions, respondToTransaction } = useTransactionStore();
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => { fetchTransactions(leagueId); }, [leagueId]);
  useEffect(() => { fetchTransactions(leagueId, filter ?? undefined); }, [filter]);

  return (
    <View style={styles.tabContent}>
      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }}>
        {[null, "trade", "waiver"].map((t) => (
          <TouchableOpacity
            key={t ?? "all"}
            style={[draftStyles.filterChip, filter === t && { backgroundColor: "#1a73e8" }]}
            onPress={() => setFilter(t)}
          >
            <Text style={[draftStyles.filterChipText, filter === t && { color: "#fff" }]}>
              {t === null ? "All" : t === "trade" ? "Trades" : "Waivers"}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator color="#1a73e8" />}

      {!loading && transactions.length === 0 && (
        <Text style={{ color: "#999", textAlign: "center", marginTop: 40 }}>No transactions yet.</Text>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const isTrade = item.type === "trade";
          return (
            <View style={txnStyles.card}>
              <View style={txnStyles.header}>
                <View style={[txnStyles.typeBadge, { backgroundColor: isTrade ? "#3498db" : "#e67e22" }]}>
                  <Text style={txnStyles.typeBadgeText}>{isTrade ? "TRADE" : "WAIVER"}</Text>
                </View>
                <View style={[txnStyles.statusBadge, { backgroundColor: TXN_STATUS_COLORS[item.status] ?? "#999" }]}>
                  <Text style={txnStyles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 14, color: "#333", marginTop: 6 }}>
                {isTrade
                  ? `${item.proposed_by_name ?? "Unknown"} proposes trade`
                  : `${item.proposed_by_name ?? "Unknown"} claims ${item.details.player_name ?? item.details.player_id}`}
              </Text>

              {isTrade && (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: "#666" }}>
                    Sends: {(item.details.send_player_ids ?? []).length} player(s)
                  </Text>
                  <Text style={{ fontSize: 12, color: "#666" }}>
                    Receives: {(item.details.receive_player_ids ?? []).length} player(s)
                  </Text>
                </View>
              )}

              {item.type === "waiver" && item.details.bid_amount > 0 && (
                <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Bid: ${item.details.bid_amount}</Text>
              )}

              <Text style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                {new Date(item.proposed_at).toLocaleDateString()}
              </Text>

              {/* Action buttons for pending trades */}
              {item.status === "pending" && isTrade && (
                <View style={txnStyles.actions}>
                  <TouchableOpacity
                    style={[txnStyles.actionBtn, { backgroundColor: "#5cb85c" }]}
                    onPress={() => respondToTransaction(leagueId, item.id, "accept")}
                  >
                    <Text style={txnStyles.actionBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[txnStyles.actionBtn, { backgroundColor: "#d9534f" }]}
                    onPress={() => respondToTransaction(leagueId, item.id, "reject")}
                  >
                    <Text style={txnStyles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.status === "pending" && !isTrade && (
                <TouchableOpacity
                  style={[txnStyles.actionBtn, { backgroundColor: "#999", marginTop: 8 }]}
                  onPress={() => respondToTransaction(leagueId, item.id, "cancel")}
                >
                  <Text style={txnStyles.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      {error && <Text style={{ color: "red", marginTop: 8 }}>{error}</Text>}
    </View>
  );
}

const txnStyles = StyleSheet.create({
  card: { backgroundColor: "#f8f9fa", borderRadius: 12, padding: 14, marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  typeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});

// ─── Roster Tab ──────────────────────────────────────────────────────

function RosterTab({ leagueId }: { leagueId: string }) {
  const { myRoster, loading, error, fetchMyRoster, dropPlayer } = useRosterStore();

  useEffect(() => { fetchMyRoster(leagueId); }, [leagueId]);

  if (loading && !myRoster) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1a73e8" />;

  const starters = myRoster?.players.filter((p) => !p.slot.startsWith("BN")) ?? [];
  const bench = myRoster?.players.filter((p) => p.slot.startsWith("BN")) ?? [];

  return (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>{myRoster?.team_name ?? "My Roster"}</Text>

      {/* Starters */}
      <Text style={{ fontWeight: "700", fontSize: 13, color: "#999", marginBottom: 8, letterSpacing: 1 }}>STARTERS</Text>
      {starters.map((p) => (
        <View key={p.player_id} style={rosterStyles.playerRow}>
          <View style={[draftStyles.posBadge, { backgroundColor: POS_COLORS[p.position ?? ""] ?? "#ccc", width: 32, height: 32, borderRadius: 16 }]}>
            <Text style={draftStyles.posBadgeText}>{p.slot}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: "500" }}>{p.full_name ?? p.player_id}</Text>
            <Text style={{ fontSize: 12, color: "#999" }}>{p.position} — {p.team ?? "FA"}</Text>
          </View>
          <Text style={{ fontWeight: "600", fontSize: 15 }}>{p.points_this_week}</Text>
        </View>
      ))}

      {/* Bench */}
      <Text style={{ fontWeight: "700", fontSize: 13, color: "#999", marginTop: 20, marginBottom: 8, letterSpacing: 1 }}>BENCH</Text>
      {bench.map((p) => (
        <TouchableOpacity
          key={p.player_id}
          style={rosterStyles.playerRow}
          onLongPress={() => {
            Alert.alert(`Drop ${p.full_name}?`, "This player will become a free agent.", [
              { text: "Cancel", style: "cancel" },
              { text: "Drop", style: "destructive", onPress: () => dropPlayer(leagueId, p.player_id) },
            ]);
          }}
        >
          <View style={[draftStyles.posBadge, { backgroundColor: "#ddd", width: 32, height: 32, borderRadius: 16 }]}>
            <Text style={[draftStyles.posBadgeText, { color: "#666" }]}>BN</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: "500" }}>{p.full_name ?? p.player_id}</Text>
            <Text style={{ fontSize: 12, color: "#999" }}>{p.position} — {p.team ?? "FA"}</Text>
          </View>
          <Text style={{ fontWeight: "600", fontSize: 15, color: "#999" }}>{p.points_this_week}</Text>
        </TouchableOpacity>
      ))}

      {myRoster?.players.length === 0 && (
        <Text style={{ color: "#999", textAlign: "center", marginTop: 20 }}>No roster yet. Complete the draft first.</Text>
      )}
      {error && <Text style={{ color: "red", marginTop: 8 }}>{error}</Text>}
    </ScrollView>
  );
}

const rosterStyles = StyleSheet.create({
  playerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#f0f0f0" },
});

// ─── Matchups Tab ────────────────────────────────────────────────────

function MatchupsTab({ leagueId }: { leagueId: string }) {
  const { matchups, currentWeek, loading, error, fetchMatchups, setWeek } = useMatchupStore();

  useEffect(() => { fetchMatchups(leagueId); }, [leagueId]);

  const changeWeek = (delta: number) => {
    const next = currentWeek + delta;
    if (next < 1 || next > 18) return;
    setWeek(next);
    fetchMatchups(leagueId, next);
  };

  return (
    <View style={styles.tabContent}>
      {/* Week selector */}
      <View style={matchupStyles.weekSelector}>
        <TouchableOpacity onPress={() => changeWeek(-1)}>
          <Text style={matchupStyles.weekArrow}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={matchupStyles.weekLabel}>Week {currentWeek}</Text>
        <TouchableOpacity onPress={() => changeWeek(1)}>
          <Text style={matchupStyles.weekArrow}>{">"}</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#1a73e8" />}

      {!loading && matchups.length === 0 && (
        <Text style={{ color: "#999", textAlign: "center", marginTop: 40 }}>No matchups scheduled for this week.</Text>
      )}

      <FlatList
        data={matchups}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={matchupStyles.card}>
            <View style={matchupStyles.teamRow}>
              <Text style={matchupStyles.teamName} numberOfLines={1}>{item.team_a_name ?? "Team A"}</Text>
              <Text style={[matchupStyles.score, item.team_a_score > item.team_b_score && matchupStyles.winning]}>
                {item.team_a_score.toFixed(1)}
              </Text>
            </View>
            <View style={matchupStyles.vs}><Text style={{ color: "#ccc", fontSize: 12 }}>vs</Text></View>
            <View style={matchupStyles.teamRow}>
              <Text style={matchupStyles.teamName} numberOfLines={1}>{item.team_b_name ?? "Team B"}</Text>
              <Text style={[matchupStyles.score, item.team_b_score > item.team_a_score && matchupStyles.winning]}>
                {item.team_b_score.toFixed(1)}
              </Text>
            </View>
            {item.is_complete && <Text style={matchupStyles.finalBadge}>FINAL</Text>}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      {error && <Text style={{ color: "red", marginTop: 8 }}>{error}</Text>}
    </View>
  );
}

const matchupStyles = StyleSheet.create({
  weekSelector: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  weekArrow: { fontSize: 24, color: "#1a73e8", paddingHorizontal: 20 },
  weekLabel: { fontSize: 18, fontWeight: "bold" },
  card: { backgroundColor: "#f8f9fa", borderRadius: 12, padding: 14, marginBottom: 12 },
  teamRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  teamName: { fontSize: 15, fontWeight: "500", flex: 1 },
  score: { fontSize: 18, fontWeight: "bold", color: "#333", minWidth: 50, textAlign: "right" },
  winning: { color: "#1a73e8" },
  vs: { alignItems: "center", paddingVertical: 2 },
  finalBadge: { textAlign: "center", marginTop: 6, fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 1 },
});

// ─── Draft Tab ───────────────────────────────────────────────────────

const POS_COLORS: Record<string, string> = { QB: "#e74c3c", RB: "#2ecc71", WR: "#3498db", TE: "#e67e22", K: "#9b59b6", DEF: "#95a5a6" };

function DraftTab({ leagueId }: { leagueId: string }) {
  const {
    draft, picks, members, availablePlayers, timeRemaining, loading, error,
    fetchBoard, fetchAvailable, startDraft, makePick, updateSettings, setOrder,
    applyBoardUpdate, applyPickMade, setTimeRemaining, reset,
  } = useDraftStore();

  const { lastMessage, connected, send } = useWebSocket(`/ws/draft/${leagueId}`);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string | null>(null);
  const authed = useRef(false);

  // Auth on connect
  useEffect(() => {
    if (connected && !authed.current) {
      (async () => {
        const token = await SecureStore.getItemAsync("access_token");
        if (token) {
          send({ action: "auth", token });
          authed.current = true;
          send({ action: "join" });
        }
      })();
    }
  }, [connected]);

  // Handle WS messages
  useEffect(() => {
    if (!lastMessage) return;
    const { type } = lastMessage;
    if (type === "board") applyBoardUpdate(lastMessage);
    else if (type === "pick_made" || type === "auto_pick") applyPickMade(lastMessage.pick, lastMessage.draft);
    else if (type === "timer") setTimeRemaining(lastMessage.remaining);
  }, [lastMessage]);

  // Fetch board on mount
  useEffect(() => { fetchBoard(leagueId); }, [leagueId]);

  // Fetch available players when search/filter changes
  useEffect(() => {
    if (draft?.status === "in_progress") fetchAvailable(leagueId, posFilter ?? undefined, search || undefined);
  }, [search, posFilter, draft?.status]);

  useEffect(() => () => { reset(); authed.current = false; }, []);

  if (loading && !draft) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1a73e8" />;

  // Pre-draft lobby
  if (!draft || draft.status === "scheduled") {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Draft Lobby</Text>
        <Text style={{ color: "#666", marginBottom: 16 }}>
          Status: {draft?.status ?? "loading..."} {draft ? `| ${draft.type} | ${draft.rounds} rounds | ${draft.pick_time_limit}s per pick` : ""}
        </Text>
        {draft?.draft_order ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: "600", marginBottom: 8 }}>Draft Order</Text>
            {draft.draft_order.map((mid, i) => {
              const m = members.find((m) => m.id === mid);
              return <Text key={mid} style={{ paddingVertical: 4 }}>{i + 1}. {m?.team_name ?? m?.username ?? mid}</Text>;
            })}
          </View>
        ) : (
          <Text style={{ color: "#999", marginBottom: 16 }}>Order not set yet</Text>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, { marginBottom: 8 }]}
          onPress={() => setOrder(leagueId, undefined, true)}
        >
          <Text style={styles.primaryBtnText}>Randomize Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            Alert.alert("Start Draft", "Are you sure? This can't be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Start", style: "destructive", onPress: () => startDraft(leagueId) },
            ]);
          }}
        >
          <Text style={styles.primaryBtnText}>Start Draft</Text>
        </TouchableOpacity>
        {error && <Text style={{ color: "red", marginTop: 8 }}>{error}</Text>}
      </View>
    );
  }

  // Draft complete
  if (draft.status === "complete") {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Draft Complete</Text>
        <DraftPickList picks={picks} members={members} />
      </View>
    );
  }

  // In-progress draft board
  const onClock = members.find((m) => m.id === draft.on_the_clock);
  const numTeams = draft.draft_order?.length ?? 0;
  const currentRound = numTeams > 0 ? Math.floor((draft.current_pick - 1) / numTeams) + 1 : 1;

  return (
    <View style={{ flex: 1 }}>
      {/* Header: timer + on the clock */}
      <View style={draftStyles.header}>
        <View style={draftStyles.timerBox}>
          <Text style={draftStyles.timerText}>{timeRemaining}s</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={draftStyles.onClockLabel}>ON THE CLOCK</Text>
          <Text style={draftStyles.onClockName}>{onClock?.team_name ?? onClock?.username ?? "—"}</Text>
          <Text style={{ color: "#999", fontSize: 12 }}>Round {currentRound} · Pick {draft.current_pick}/{draft.total_picks}</Text>
        </View>
      </View>

      {/* Recent picks */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {picks.slice(-8).reverse().map((p) => (
            <View key={p.pick_number} style={draftStyles.recentPick}>
              <Text style={{ fontSize: 10, color: "#999" }}>#{p.pick_number}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "500" }}>{p.player_name ?? p.player_id}</Text>
              <Text style={{ fontSize: 10, color: "#666" }}>{members.find((m) => m.id === p.member_id)?.team_name ?? ""}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Search + filter */}
      <View style={draftStyles.searchRow}>
        <TextInput
          style={draftStyles.searchInput}
          placeholder="Search players..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#aaa"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingHorizontal: 12, marginBottom: 4 }}>
        {[null, "QB", "RB", "WR", "TE", "K", "DEF"].map((pos) => (
          <TouchableOpacity
            key={pos ?? "ALL"}
            style={[draftStyles.filterChip, posFilter === pos && { backgroundColor: POS_COLORS[pos ?? ""] ?? "#1a73e8" }]}
            onPress={() => setPosFilter(pos)}
          >
            <Text style={[draftStyles.filterChipText, posFilter === pos && { color: "#fff" }]}>{pos ?? "All"}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Available players list */}
      <FlatList
        data={availablePlayers}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={draftStyles.playerRow}
            onPress={() => {
              Alert.alert(`Draft ${item.full_name}?`, `${item.position} — ${item.team ?? "FA"}`, [
                { text: "Cancel", style: "cancel" },
                { text: "Draft", onPress: () => makePick(leagueId, item.id) },
              ]);
            }}
          >
            <View style={[draftStyles.posBadge, { backgroundColor: POS_COLORS[item.position] ?? "#ccc" }]}>
              <Text style={draftStyles.posBadgeText}>{item.position}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "500" }}>{item.full_name}</Text>
              <Text style={{ fontSize: 12, color: "#999" }}>{item.team ?? "Free Agent"}</Text>
            </View>
            <Text style={{ color: "#1a73e8", fontWeight: "600" }}>Draft</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
      {error && <Text style={{ color: "red", textAlign: "center", padding: 8 }}>{error}</Text>}
    </View>
  );
}

function DraftPickList({ picks, members }: { picks: DraftPick[]; members: DraftMember[] }) {
  return (
    <FlatList
      data={picks}
      keyExtractor={(p) => String(p.pick_number)}
      renderItem={({ item }) => {
        const team = members.find((m) => m.id === item.member_id);
        return (
          <View style={draftStyles.pickRow}>
            <Text style={{ width: 36, color: "#999", fontSize: 13 }}>#{item.pick_number}</Text>
            <Text style={{ flex: 1, fontWeight: "500" }}>{item.player_name ?? item.player_id}</Text>
            <Text style={{ color: "#666", fontSize: 13 }}>{team?.team_name ?? ""}</Text>
          </View>
        );
      }}
    />
  );
}

const draftStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#f0f4ff", borderBottomWidth: 1, borderColor: "#ddd" },
  timerBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#1a73e8", justifyContent: "center", alignItems: "center" },
  timerText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  onClockLabel: { fontSize: 10, fontWeight: "700", color: "#1a73e8", letterSpacing: 1 },
  onClockName: { fontSize: 18, fontWeight: "bold" },
  recentPick: { backgroundColor: "#f8f8f8", borderRadius: 8, padding: 8, marginRight: 8, width: 100 },
  searchRow: { paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { backgroundColor: "#f5f5f5", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f0f0f0", marginRight: 8 },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#666" },
  playerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  posBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  posBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  pickRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backText: { color: "#1a73e8", fontSize: 16 },
  leagueName: { fontSize: 18, fontWeight: "bold", flex: 1, textAlign: "center", marginHorizontal: 8 },
  shareText: { color: "#1a73e8", fontSize: 16 },
  tabBar: { flexGrow: 0, borderBottomWidth: 1, borderColor: "#eee" },
  tab: { paddingHorizontal: 16, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderColor: "#1a73e8" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#999" },
  tabTextActive: { color: "#1a73e8" },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 16, color: "#999" },
  tabContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  // Members
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e3eaf5", justifyContent: "center", alignItems: "center", marginRight: 12 },
  memberAvatarText: { fontSize: 16, fontWeight: "bold", color: "#1a73e8" },
  memberName: { fontSize: 16, fontWeight: "500" },
  memberUsername: { fontSize: 13, color: "#999" },
  commBadge: { backgroundColor: "#fff3cd", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, color: "#856404", fontWeight: "600", overflow: "hidden" },
  inviteBox: { marginTop: 24, backgroundColor: "#f0f4ff", borderRadius: 10, padding: 16, alignItems: "center" },
  inviteLabel: { fontSize: 13, color: "#666", marginBottom: 4 },
  inviteCode: { fontSize: 24, fontWeight: "bold", letterSpacing: 2, color: "#1a73e8" },
  // Standings
  standingsHeader: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderColor: "#ddd" },
  standingsRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  standingsCol: { flex: 1, fontSize: 14, textAlign: "center" },
  // Settings
  settingRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  settingLabel: { fontSize: 16, color: "#333" },
  settingValue: { fontSize: 16, fontWeight: "500", color: "#666" },
  // Draft lobby buttons
  primaryBtn: { backgroundColor: "#1a73e8", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
