import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Image, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { usePartner } from "../hooks/usePartner";
import FadeScreen from "../components/FadeScreen";
import ScreenHeader from "../components/ScreenHeader";

const MOODS = [
  { emoji: "💻", label: "Coding"    },
  { emoji: "🥁", label: "Drumming"  },
  { emoji: "☕", label: "Coffee"    },
  { emoji: "😴", label: "Resting"   },
  { emoji: "🎮", label: "Gaming"    },
  { emoji: "🍕", label: "Eating"    },
  { emoji: "🎵", label: "Listening" },
  { emoji: "📚", label: "Reading"   },
  { emoji: "🏃", label: "Active"    },
  { emoji: "🧘", label: "Relaxing"  },
];

export default function UsDashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId, profile, partner, loading, updateStatus, getAvatarUrl } = usePartner();

  const [partnerOnline, setPartnerOnline]     = useState(false);
  const [nudgeCooldown, setNudgeCooldown]     = useState(false);
  const [showNudgeBanner, setShowNudgeBanner] = useState(false);
  const [latestMemory, setLatestMemory]       = useState(null);
  const [refreshing, setRefreshing]           = useState(false);

  const realtimeChannel   = useRef(null);
  const bannerY           = useRef(new Animated.Value(-100)).current;
  const bannerOpacity     = useRef(new Animated.Value(0)).current;
  const nudgeBtnScale     = useRef(new Animated.Value(1)).current;

  // Heartbeat dots
  const d1 = useRef(new Animated.Value(0.15)).current;
  const d2 = useRef(new Animated.Value(0.15)).current;
  const d3 = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const pulse = (val, delay) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1,    duration: 300, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.15, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ]));
    Animated.parallel([pulse(d1, 0), pulse(d2, 400), pulse(d3, 800)]).start();
  }, []);

  // Presence + nudge broadcast channel
  useEffect(() => {
    if (!userId || !profile?.partner_id) return;

    const name = `couple:${[userId, profile.partner_id].sort().join(":")}`;
    const ch = supabase.channel(name, {
      config: { presence: { key: userId } },
    });

    ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        setPartnerOnline(!!(state[profile.partner_id]?.length));
      })
      .on("broadcast", { event: "nudge" }, handleNudgeReceived)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await ch.track({ online: true });
      });

    realtimeChannel.current = ch;
    return () => { ch.unsubscribe(); realtimeChannel.current = null; };
  }, [userId, profile?.partner_id]);

  useEffect(() => { fetchLatestMemory(); }, []);

  const fetchLatestMemory = async () => {
    const { data } = await supabase
      .from("memories")
      .select("id, title, description, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) setLatestMemory(data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLatestMemory();
    setRefreshing(false);
  };

  const handleNudgeReceived = async () => {
    // Heartbeat haptic pattern
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(650);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Slide-down banner
    setShowNudgeBanner(true);
    Animated.parallel([
      Animated.spring(bannerY,      { toValue: 0,  friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(bannerOpacity, { toValue: 1,  duration: 220, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(bannerY,      { toValue: -100, duration: 280, useNativeDriver: true }),
        Animated.timing(bannerOpacity, { toValue: 0,    duration: 280, useNativeDriver: true }),
      ]).start(() => setShowNudgeBanner(false));
    }, 3200);
  };

  const handleSendNudge = async () => {
    if (nudgeCooldown || !realtimeChannel.current || !partner) return;

    Animated.sequence([
      Animated.timing(nudgeBtnScale, { toValue: 0.94, duration: 90,  useNativeDriver: true }),
      Animated.spring(nudgeBtnScale, { toValue: 1,    friction: 4,   useNativeDriver: true }),
    ]).start();

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await realtimeChannel.current.send({
      type: "broadcast", event: "nudge", payload: { from: userId },
    });

    setNudgeCooldown(true);
    setTimeout(() => setNudgeCooldown(false), 10000);
  };

  const handleMoodSelect = async (emoji) => {
    await Haptics.selectionAsync();
    await updateStatus(emoji);
  };

  const daysCount = profile?.anniversary_date
    ? Math.floor((Date.now() - new Date(profile.anniversary_date).getTime()) / 86400000)
    : null;

  const myAvatarUrl      = getAvatarUrl(profile?.avatar_url);
  const partnerAvatarUrl = getAvatarUrl(partner?.avatar_url);
  const canNudge         = !!partner && !nudgeCooldown;

  if (loading) {
    return (
      <FadeScreen>
        <ScreenHeader title="Us" />
        <View style={styles.loader}><ActivityIndicator color={colors.accent} /></View>
      </FadeScreen>
    );
  }

  return (
    <FadeScreen>
      <ScreenHeader title="Us ♡" />

      {/* ── Nudge received banner ── */}
      {showNudgeBanner && (
        <Animated.View style={[
          styles.nudgeBanner,
          { backgroundColor: colors.surface, borderColor: colors.border,
            transform: [{ translateY: bannerY }], opacity: bannerOpacity },
        ]}>
          <Text style={styles.bannerEmoji}>💕</Text>
          <View>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>Thinking of you</Text>
            <Text style={[styles.bannerSub, { color: colors.textSub }]}>
              from {partner?.username || "your partner"}
            </Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={colors.accent} colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* ── Connection card ── */}
        <View style={[styles.connectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* My avatar */}
          <View style={styles.avatarCol}>
            {myAvatarUrl
              ? <Image source={{ uri: myAvatarUrl }} style={styles.avatar} />
              : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.accent }]}>
                  <Text style={styles.avatarInitial}>{profile?.username?.[0]?.toUpperCase() ?? "?"}</Text>
                </View>}
            <Text style={[styles.avatarName, { color: colors.text }]} numberOfLines={1}>
              {profile?.username || "You"}
            </Text>
            {profile?.status
              ? <Text style={styles.statusEmoji}>{profile.status}</Text>
              : <Text style={[styles.statusEmoji, { opacity: 0 }]}>·</Text>}
          </View>

          {/* Pulsing dots */}
          <View style={styles.beatRow}>
            <Animated.View style={[styles.beatDot, { backgroundColor: colors.accent, opacity: d1 }]} />
            <Animated.View style={[styles.beatDot, { backgroundColor: colors.accent, opacity: d2 }]} />
            <Animated.View style={[styles.beatDot, { backgroundColor: colors.accent, opacity: d3 }]} />
          </View>

          {/* Partner avatar */}
          <View style={styles.avatarCol}>
            {partner ? (
              <>
                <View>
                  {partnerAvatarUrl
                    ? <Image source={{ uri: partnerAvatarUrl }} style={styles.avatar} />
                    : <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: "#6C8EFF" }]}>
                        <Text style={styles.avatarInitial}>{partner?.username?.[0]?.toUpperCase() ?? "?"}</Text>
                      </View>}
                  <View style={[styles.onlineDot, {
                    backgroundColor: partnerOnline ? "#22C55E" : colors.borderStrong,
                    borderColor: colors.surface,
                  }]} />
                </View>
                <Text style={[styles.avatarName, { color: colors.text }]} numberOfLines={1}>
                  {partner?.username || "Partner"}
                </Text>
                {partner?.status
                  ? <Text style={styles.statusEmoji}>{partner.status}</Text>
                  : <Text style={[styles.statusEmoji, { opacity: 0 }]}>·</Text>}
              </>
            ) : (
              <>
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.border }]}>
                  <Ionicons name="person-add-outline" size={26} color={colors.textMuted} />
                </View>
                <Text style={[styles.avatarName, { color: colors.textMuted }]}>Partner</Text>
                <Text style={[styles.statusEmoji, { opacity: 0 }]}>·</Text>
              </>
            )}
          </View>
        </View>

        {/* ── Anniversary counter ── */}
        {daysCount !== null ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>TOGETHER SINCE</Text>
            <View style={styles.anniversaryRow}>
              <Text style={[styles.daysCount, { color: colors.text }]}>
                {daysCount.toLocaleString()}
              </Text>
              <Text style={[styles.daysUnit, { color: colors.textSub }]}> days</Text>
            </View>
            <Text style={[styles.anniversaryDate, { color: colors.textMuted }]}>
              Since {new Date(profile.anniversary_date).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, styles.inlineRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Set your anniversary date in Settings
            </Text>
          </View>
        )}

        {/* ── Digital Nudge ── */}
        <Animated.View style={{ transform: [{ scale: nudgeBtnScale }] }}>
          <TouchableOpacity
            onPress={handleSendNudge}
            activeOpacity={0.88}
            disabled={!canNudge}
            style={styles.nudgeOuter}
          >
            <LinearGradient
              colors={canNudge ? ["#FF5D8F", "#FF8FA8", "#FF5D8F"] : [colors.surface, colors.surface]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.nudgeBtn, !canNudge && { borderWidth: 1, borderColor: colors.border }]}
            >
              <Text style={styles.nudgeBtnIcon}>💕</Text>
              <Text style={[styles.nudgeBtnLabel, { color: canNudge ? "#FFFFFF" : colors.textMuted }]}>
                {nudgeCooldown ? "Nudge sent ✓" : !partner ? "No partner linked" : "Send a Nudge"}
              </Text>
              {canNudge && (
                <Text style={styles.nudgeBtnSub}>
                  Let them know you're thinking of them
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Mood / status selector ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>YOUR STATUS</Text>
          <View style={styles.moodGrid}>
            {MOODS.map((m) => {
              const active = profile?.status === m.emoji;
              return (
                <TouchableOpacity
                  key={m.emoji}
                  style={[styles.moodChip, {
                    backgroundColor: active ? `${colors.accent}20` : colors.bg,
                    borderColor:     active ? colors.accent : colors.border,
                  }]}
                  onPress={() => handleMoodSelect(m.emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: active ? colors.accent : colors.textSub }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Latest memory widget ── */}
        {latestMemory && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>LATEST MEMORY</Text>
            <View style={styles.inlineRow}>
              <View style={[styles.memoryIcon, { backgroundColor: `${colors.accent}18` }]}>
                <Ionicons name="map" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memoryTitle, { color: colors.text }]} numberOfLines={1}>
                  {latestMemory.title || "Untitled memory"}
                </Text>
                <Text style={[styles.memoryDate, { color: colors.textMuted }]}>
                  {new Date(latestMemory.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </FadeScreen>
  );
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },

  // Nudge banner
  nudgeBanner: {
    position: "absolute", top: 8, left: 16, right: 16, zIndex: 99,
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  bannerEmoji: { fontSize: 30 },
  bannerTitle: { fontSize: 15, fontFamily: "Catamaran_700Bold" },
  bannerSub:   { fontSize: 12, fontFamily: "Catamaran_400Regular" },

  // Connection card
  connectionCard: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20, borderWidth: 1, padding: 24,
  },
  avatarCol:    { alignItems: "center", gap: 6, flex: 1 },
  avatar:       { width: 70, height: 70, borderRadius: 35 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial:  { fontSize: 28, fontFamily: "Catamaran_700Bold", color: "#FFFFFF" },
  avatarName:     { fontSize: 13, fontFamily: "Catamaran_600SemiBold", maxWidth: 80, textAlign: "center" },
  statusEmoji:    { fontSize: 18 },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7, borderWidth: 2,
  },
  beatRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 6 },
  beatDot: { width: 9, height: 9, borderRadius: 5 },

  // Cards
  card: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 12 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  eyebrow: { fontSize: 10, fontFamily: "Catamaran_600SemiBold", letterSpacing: 1.2 },
  emptyHint: { fontSize: 14, fontFamily: "Catamaran_400Regular", flex: 1 },

  // Anniversary
  anniversaryRow: { flexDirection: "row", alignItems: "flex-end" },
  daysCount: { fontSize: 54, fontFamily: "Catamaran_700Bold", lineHeight: 58, letterSpacing: -2 },
  daysUnit:  { fontSize: 22, fontFamily: "Catamaran_400Regular", marginBottom: 7 },
  anniversaryDate: { fontSize: 13, fontFamily: "Catamaran_400Regular", marginTop: -4 },

  // Nudge button
  nudgeOuter: { borderRadius: 20, overflow: "hidden" },
  nudgeBtn: { padding: 30, alignItems: "center", gap: 6, borderRadius: 20 },
  nudgeBtnIcon:  { fontSize: 42 },
  nudgeBtnLabel: { fontSize: 20, fontFamily: "Catamaran_700Bold", letterSpacing: -0.3 },
  nudgeBtnSub:   { fontSize: 13, fontFamily: "Catamaran_400Regular", color: "rgba(255,255,255,0.75)", textAlign: "center" },

  // Mood
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  moodEmoji: { fontSize: 15 },
  moodLabel: { fontSize: 12, fontFamily: "Catamaran_600SemiBold" },

  // Latest memory
  memoryIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  memoryTitle: { fontSize: 15, fontFamily: "Catamaran_600SemiBold" },
  memoryDate:  { fontSize: 12, fontFamily: "Catamaran_400Regular", marginTop: 2 },
});
