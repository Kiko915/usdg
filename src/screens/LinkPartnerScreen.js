import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { usePartnerRequest } from "../hooks/usePartnerRequest";
import { usePartner } from "../hooks/usePartner";

const ACCENT = "#FF5D8F";
const ACCENT_SOFT = "#FF5D8F18";
const ACCENT_BORDER = "#FF5D8F33";

const ERROR_COPY = {
  user_not_found:          "No account found with that username.",
  cannot_request_self:     "You can\u2019t send a request to yourself.",
  already_linked:          "You\u2019re already linked to someone.",
  target_already_linked:   "This person is already linked to someone.",
  request_already_sent:    "You already have a pending request.",
  incoming_request_exists: "This person already sent you a request \u2014 accept it from the Us tab.",
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ username }) {
  const letter = username?.[0]?.toUpperCase() ?? "?";
  return (
    <LinearGradient
      colors={["#FF5D8F", "#FF8FAD"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatar}
    >
      <Text style={styles.avatarLetter}>{letter}</Text>
    </LinearGradient>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────
function UserRow({ item, onSend, busy, sent, colors }) {
  const taken = !!item.partner_id;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Avatar username={item.username} />

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowUsername, { color: colors.text }]}>
          @{item.username}
        </Text>
        {taken && (
          <Text style={[styles.rowSub, { color: colors.textSub }]}>
            Already linked
          </Text>
        )}
      </View>

      {taken ? (
        <View style={[styles.pill, { backgroundColor: colors.iconBgDefault, borderColor: colors.border }]}>
          <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
          <Text style={[styles.pillText, { color: colors.textMuted }]}>Taken</Text>
        </View>
      ) : sent ? (
        <View style={[styles.pill, { backgroundColor: ACCENT_SOFT, borderColor: ACCENT_BORDER }]}>
          <Ionicons name="checkmark-circle" size={13} color={ACCENT} />
          <Text style={[styles.pillText, { color: ACCENT }]}>Sent</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.linkBtn, busy && styles.linkBtnBusy]}
          onPress={() => onSend(item.username)}
          disabled={busy}
          activeOpacity={0.75}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.linkBtnText}>Link</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Empty / initial state ────────────────────────────────────────────────────
function EmptyState({ query, searching, colors }) {
  if (searching) return null;

  if (!query.trim()) {
    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIconWrap, { backgroundColor: ACCENT_SOFT }]}>
          <Ionicons name="search" size={28} color={ACCENT} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Find your partner</Text>
        <Text style={[styles.emptySub, { color: colors.textSub }]}>
          Type their username above to search
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.iconBgDefault }]}>
        <Ionicons name="person-outline" size={28} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No results for &ldquo;{query}&rdquo;
      </Text>
      <Text style={[styles.emptySub, { color: colors.textSub }]}>
        Double-check the spelling or ask them for their exact username.
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LinkPartnerScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = usePartner();
  const { sendRequest, requestBusy } = usePartnerRequest(userId);

  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState([]);
  const [searching, setSearching]     = useState(false);
  const [error, setError]             = useState(null);
  const [sentUsernames, setSentUsernames] = useState(new Set());

  const debounceRef   = useRef(null);
  const inputRef      = useRef(null);
  const listOpacity   = useRef(new Animated.Value(0)).current;

  // Auto-focus after mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const fadeList = useCallback((toValue) => {
    Animated.timing(listOpacity, {
      toValue,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [listOpacity]);

  const search = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      fadeList(0);
      return;
    }
    setSearching(true);
    setError(null);
    fadeList(0);

    const { data, error: err } = await supabase
      .from("profiles")
      .select("id, username, partner_id")
      .ilike("username", `%${trimmed}%`)
      .neq("id", userId ?? "00000000-0000-0000-0000-000000000000")
      .order("username")
      .limit(20);

    setSearching(false);
    if (err) {
      setError("Search failed. Please try again.");
      return;
    }
    setResults(data ?? []);
    fadeList(1);
  }, [userId, fadeList]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setError(null);
      fadeList(0);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, search, fadeList]);

  const handleSend = async (username) => {
    setError(null);
    const result = await sendRequest(username);
    if (result?.error) {
      setError(ERROR_COPY[result.error] ?? "Something went wrong.");
    } else {
      setSentUsernames((prev) => new Set([...prev, username]));
    }
  };

  const showEmptyState = !searching && results.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
      <View style={[
        styles.header,
        { paddingTop: insets.top + 10, backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.iconBgDefault }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Link a partner</Text>
          <Text style={[styles.headerSub, { color: colors.textSub }]}>
            Connect with someone special
          </Text>
        </View>

        {/* Right spacer matches back button width */}
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flex: 1 }}>
        {/* ── Search bar ── */}
        <View style={styles.searchWrap}>
          <View style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={(t) => { setQuery(t); setError(null); }}
              placeholder="Search by username…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Error banner ── */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: "#FF3B5C12", borderColor: "#FF3B5C33" }]}>
            <Ionicons name="information-circle" size={16} color="#FF3B5C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Results list ── */}
        <Animated.View style={{ flex: 1, opacity: showEmptyState ? 1 : listOpacity }}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{ paddingBottom: insets.bottom + 32, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => null}
            renderItem={({ item }) => (
              <UserRow
                item={item}
                onSend={handleSend}
                busy={requestBusy}
                sent={sentUsernames.has(item.username)}
                colors={colors}
              />
            )}
            ListEmptyComponent={
              <EmptyState query={query} searching={searching} colors={colors} />
            }
          />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Catamaran_700Bold" },
  headerSub:   { fontSize: 12, fontFamily: "Catamaran_400Regular" },

  // Search
  searchWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 14, height: 50,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: "Catamaran_400Regular",
  },

  // Error
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 20, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 14, borderWidth: 1,
  },
  errorText: {
    flex: 1, fontSize: 13, fontFamily: "Catamaran_400Regular",
    color: "#FF3B5C", lineHeight: 18,
  },

  // Row
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },

  // Avatar
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 19, fontFamily: "Catamaran_700Bold", color: "#fff",
  },

  rowUsername: { fontSize: 15, fontFamily: "Catamaran_600SemiBold" },
  rowSub:      { fontSize: 12, fontFamily: "Catamaran_400Regular" },

  // Pill (sent / taken)
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  pillText: { fontSize: 12, fontFamily: "Catamaran_600SemiBold" },

  // Link button
  linkBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 999, minWidth: 64, alignItems: "center",
  },
  linkBtnBusy: { backgroundColor: "#FF5D8F88" },
  linkBtnText: { fontSize: 13, fontFamily: "Catamaran_700Bold", color: "#fff" },

  // Empty state
  emptyWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 56, paddingHorizontal: 40, gap: 12,
  },
  emptyIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Catamaran_700Bold", textAlign: "center" },
  emptySub:   {
    fontSize: 13, fontFamily: "Catamaran_400Regular",
    textAlign: "center", lineHeight: 20,
  },
});
