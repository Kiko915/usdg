import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Image, ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { usePartner } from "../hooks/usePartner";
import { usePartnerRequest } from "../hooks/usePartnerRequest";
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

function SectionLabel({ label, colors, right }) {
  return (
    <View style={sectionLabelRow}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{label}</Text>
      {right}
    </View>
  );
}

const sectionLabelRow = { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginLeft: 2 };

function Avatar({ url, initials, size = 72, accentColor, colors, pending }) {
  return (
    <View style={[
      styles.avatarRing,
      {
        width: size + 6, height: size + 6, borderRadius: (size + 6) / 2,
        borderColor: pending ? accentColor + "33" : accentColor + "55",
        borderStyle: pending ? "dashed" : "solid",
      },
    ]}>
      {url
        ? <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2, opacity: pending ? 0.6 : 1 }} />
        : <View style={[{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: pending ? accentColor + "44" : accentColor,
            alignItems: "center", justifyContent: "center",
          }]}>
            <Text style={{ fontSize: size * 0.38, fontFamily: "Catamaran_700Bold", color: "#fff", opacity: pending ? 0.7 : 1 }}>
              {initials}
            </Text>
          </View>}
    </View>
  );
}

export default function UsDashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { userId, profile, partner, loading, updateStatus } = usePartner();
  const {
    incomingRequest, outgoingRequest,
    requestLoading, requestBusy,
    acceptRequest, declineRequest, cancelOutgoingRequest,
  } = usePartnerRequest(userId);

  const [partnerOnline, setPartnerOnline]   = useState(false);
  const [nudgeCooldown, setNudgeCooldown]   = useState(false);
  const [showNudgeBanner, setShowNudgeBanner] = useState(false);
  const [latestMemory, setLatestMemory]     = useState(null);
  const [refreshing, setRefreshing]         = useState(false);

  const realtimeChannel = useRef(null);
  const bannerY         = useRef(new Animated.Value(-120)).current;
  const bannerOpacity   = useRef(new Animated.Value(0)).current;
  const nudgeBtnScale   = useRef(new Animated.Value(1)).current;

  // Heartbeat dots
  const d1 = useRef(new Animated.Value(0.2)).current;
  const d2 = useRef(new Animated.Value(0.2)).current;
  const d3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const pulse = (val, delayMs) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(val, { toValue: 1,   duration: 350, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.2, duration: 350, useNativeDriver: true }),
        Animated.delay(700),
      ]));
    Animated.parallel([pulse(d1, 0), pulse(d2, 350), pulse(d3, 700)]).start();
  }, []);

  useEffect(() => {
    if (!userId || !profile?.partner_id) return;
    const name = `couple:${[userId, profile.partner_id].sort().join(":")}`;
    const ch = supabase.channel(name, { config: { presence: { key: userId } } });
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
      .limit(1).single();
    if (data) setLatestMemory(data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLatestMemory();
    setRefreshing(false);
  };

  const handleNudgeReceived = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(650);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(150);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowNudgeBanner(true);
    Animated.parallel([
      Animated.spring(bannerY,       { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.timing(bannerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(bannerY,       { toValue: -120, duration: 280, useNativeDriver: true }),
        Animated.timing(bannerOpacity, { toValue: 0,    duration: 280, useNativeDriver: true }),
      ]).start(() => setShowNudgeBanner(false));
    }, 3200);
  };

  const handleSendNudge = async () => {
    if (nudgeCooldown || !realtimeChannel.current || !partner) return;
    Animated.sequence([
      Animated.timing(nudgeBtnScale, { toValue: 0.94, duration: 90, useNativeDriver: true }),
      Animated.spring(nudgeBtnScale, { toValue: 1, friction: 4,     useNativeDriver: true }),
    ]).start();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await realtimeChannel.current.send({ type: "broadcast", event: "nudge", payload: { from: userId } });
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

  const myAvatarUrl      = profile?.avatar_url ?? null;
  const partnerAvatarUrl = partner?.avatar_url ?? null;
  const canNudge         = !!partner && !nudgeCooldown;

  if (loading || requestLoading) {
    return (
      <FadeScreen>
        <ScreenHeader title="Us" />
        <View style={styles.loader}><ActivityIndicator color={colors.accent} /></View>
      </FadeScreen>
    );
  }

  return (
    <FadeScreen>
      <ScreenHeader title="Us" />

      {/* ── Nudge received banner ── */}
      {showNudgeBanner && (
        <Animated.View style={[
          styles.nudgeBanner,
          { backgroundColor: colors.surface, borderColor: colors.border,
            transform: [{ translateY: bannerY }], opacity: bannerOpacity },
        ]}>
          <LinearGradient
            colors={["#FF5D8F22", "transparent"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.bannerIconWrap, { backgroundColor: "#FF5D8F18" }]}>
            <Text style={{ fontSize: 22 }}>💕</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>Thinking of you</Text>
            <Text style={[styles.bannerSub,   { color: colors.textSub }]}>
              {partner?.username || "Your partner"} sent you a nudge
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
          {/* ── Incoming request banner ── */}
          {incomingRequest && !partner && (
            <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: "#FF5D8F44" }]}>
              <LinearGradient
                colors={["#FF5D8F14", "transparent"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.requestCardInner}>
                {incomingRequest.senderAvatarUrl ? (
                  <View style={[styles.requestInitialBubble, { overflow: "hidden" }]}>
                    <Image source={{ uri: incomingRequest.senderAvatarUrl }} style={StyleSheet.absoluteFill} />
                  </View>
                ) : (
                  <View style={[styles.requestInitialBubble, { backgroundColor: "#FF5D8F" }]}>
                    <Text style={styles.requestInitialText}>
                      {incomingRequest.senderUsername?.[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.requestTitle, { color: colors.text }]}>
                    <Text style={{ fontFamily: "Catamaran_700Bold" }}>@{incomingRequest.senderUsername}</Text>
                    {" "}wants to link
                  </Text>
                  <Text style={[styles.requestSub, { color: colors.textMuted }]}>
                    Accept to become partners
                  </Text>
                </View>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.requestBtn, styles.declineBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                  onPress={() => declineRequest(incomingRequest.id)}
                  disabled={requestBusy}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.requestBtnText, { color: colors.textSub }]}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.requestBtn, styles.acceptBtn]}
                  onPress={() => acceptRequest(incomingRequest.id)}
                  disabled={requestBusy}
                  activeOpacity={0.75}
                >
                  {requestBusy
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={[styles.requestBtnText, { color: "#fff" }]}>Accept</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Connection card ── */}
          <View style={[styles.connectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient
              colors={["#FF5D8F18", "transparent"]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={styles.cardAccentStrip}
            />

            <View style={styles.connectionInner}>
              {/* My side */}
              <View style={styles.personCol}>
                <Avatar
                  url={myAvatarUrl}
                  initials={profile?.username?.[0]?.toUpperCase() ?? "?"}
                  accentColor="#FF5D8F"
                  colors={colors}
                />
                <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
                  {profile?.username || "You"}
                </Text>
                {profile?.status ? (
                  <View style={[styles.statusPill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={styles.statusPillEmoji}>{profile.status}</Text>
                  </View>
                ) : (
                  <View style={[styles.statusPill, { backgroundColor: "transparent", borderColor: "transparent" }]}>
                    <Text style={{ fontSize: 13, opacity: 0 }}>·</Text>
                  </View>
                )}
              </View>

              {/* Center beat */}
              <View style={styles.beatCenter}>
                <Animated.View style={[styles.beatDot, { backgroundColor: colors.accent, opacity: d1 }]} />
                <Animated.View style={[styles.beatDot, { backgroundColor: colors.accent, opacity: d2 }]} />
                <Animated.View style={[styles.beatDot, { backgroundColor: colors.accent, opacity: d3 }]} />
              </View>

              {/* Partner side */}
              <View style={styles.personCol}>
                {partner ? (
                  <>
                    <View>
                      <Avatar
                        url={partnerAvatarUrl}
                        initials={partner?.username?.[0]?.toUpperCase() ?? "?"}
                        accentColor="#6C8EFF"
                        colors={colors}
                      />
                      <View style={[styles.onlineDot, {
                        backgroundColor: partnerOnline ? "#22C55E" : colors.borderStrong,
                        borderColor: colors.surface,
                      }]} />
                    </View>
                    <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
                      {partner?.username || "Partner"}
                    </Text>
                    {partner?.status ? (
                      <View style={[styles.statusPill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        <Text style={styles.statusPillEmoji}>{partner.status}</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusPill, { backgroundColor: "transparent", borderColor: "transparent" }]}>
                        <Text style={{ fontSize: 13, opacity: 0 }}>·</Text>
                      </View>
                    )}
                  </>
                ) : outgoingRequest ? (
                  // Outgoing request pending state
                  <>
                    <Avatar
                      url={outgoingRequest.receiverAvatarUrl}
                      initials={outgoingRequest.receiverUsername?.[0]?.toUpperCase() ?? "?"}
                      accentColor="#6C8EFF"
                      colors={colors}
                      pending
                    />
                    <Text style={[styles.personName, { color: colors.textSub }]} numberOfLines={1}>
                      @{outgoingRequest.receiverUsername}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: "#6C8EFF18", borderColor: "#6C8EFF44" }]}>
                      <Text style={[styles.statusPillEmoji, { color: "#6C8EFF", fontSize: 10 }]}>Request sent…</Text>
                    </View>
                  </>
                ) : (
                  // Unlinked state
                  <>
                    <View style={[styles.avatarRing, { width: 78, height: 78, borderRadius: 39, borderColor: colors.border }]}>
                      <View style={[{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }]}>
                        <Ionicons name="person-add-outline" size={26} color={colors.textMuted} />
                      </View>
                    </View>
                    <Text style={[styles.personName, { color: colors.textMuted }]}>Partner</Text>
                    <View style={[styles.statusPill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <Text style={[styles.statusPillEmoji, { color: colors.textMuted, fontSize: 11 }]}>Not linked</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Connection footer */}
            {partner ? (
              <View style={[styles.connectionFooter, { borderTopColor: colors.border }]}>
                <View style={[styles.connectionBadge, { backgroundColor: partnerOnline ? "#22C55E18" : colors.bg, borderColor: partnerOnline ? "#22C55E44" : colors.border }]}>
                  <View style={[styles.connectionDot, { backgroundColor: partnerOnline ? "#22C55E" : colors.borderStrong }]} />
                  <Text style={[styles.connectionLabel, { color: partnerOnline ? "#22C55E" : colors.textMuted }]}>
                    {partnerOnline ? `${partner?.username || "Partner"} is online` : "Partner is offline"}
                  </Text>
                </View>
              </View>
            ) : outgoingRequest ? (
              <View style={[styles.connectionFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity onPress={cancelOutgoingRequest} disabled={requestBusy} activeOpacity={0.7}>
                  <Text style={[styles.connectionLabel, { color: colors.textMuted }]}>Cancel request</Text>
                </TouchableOpacity>
              </View>
            ) : !incomingRequest ? (
              <View style={[styles.connectionFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.linkPill, { backgroundColor: "#FF5D8F18", borderColor: "#FF5D8F44" }]}
                  onPress={() => navigation.navigate("LinkPartner")}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add" size={13} color="#FF5D8F" />
                  <Text style={[styles.linkPillText, { color: "#FF5D8F" }]}>Link partner</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* ── Anniversary counter ── */}
          {daysCount !== null ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, overflow: "hidden" }]}>
              <LinearGradient
                colors={["#FF5D8F12", "transparent"]}
                start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TOGETHER</Text>
              <View style={styles.anniversaryBody}>
                <View style={{ flex: 1 }}>
                  <View style={styles.daysRow}>
                    <Text style={[styles.daysNumber, { color: colors.text }]}>
                      {daysCount.toLocaleString()}
                    </Text>
                    <Text style={[styles.daysWord, { color: colors.textSub }]}>days</Text>
                  </View>
                  <Text style={[styles.anniversaryDate, { color: colors.textMuted }]}>
                    Since {new Date(profile.anniversary_date).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric",
                    })}
                  </Text>
                </View>
                <View style={[styles.anniversaryIconWrap, { backgroundColor: "#FF5D8F18" }]}>
                  <Text style={{ fontSize: 32 }}>🗓️</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.emptyRow}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.bg }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No anniversary set</Text>
                  <Text style={[styles.emptyHint,  { color: colors.textMuted }]}>Add it in Settings to track your days together</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Digital Nudge ── */}
          <Animated.View style={{ transform: [{ scale: nudgeBtnScale }] }}>
            <TouchableOpacity
              onPress={handleSendNudge}
              activeOpacity={0.88}
              disabled={!canNudge}
              style={[styles.nudgeCard, {
                backgroundColor: colors.surface,
                borderColor: canNudge ? "#FF5D8F55" : colors.border,
                overflow: "hidden",
              }]}
            >
              {canNudge && (
                <LinearGradient
                  colors={["#FF5D8F14", "transparent"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View style={styles.nudgeLeft}>
                <View style={[styles.nudgeIconWrap, { backgroundColor: canNudge ? "#FF5D8F20" : colors.bg }]}>
                  <Text style={{ fontSize: 24 }}>💕</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nudgeTitle, { color: canNudge ? colors.text : colors.textMuted }]}>
                    {nudgeCooldown ? "Nudge sent!" : !partner ? "No partner linked" : "Send a Nudge"}
                  </Text>
                  <Text style={[styles.nudgeSub, { color: colors.textMuted }]}>
                    {nudgeCooldown
                      ? "They've been notified"
                      : !partner
                      ? "Link a partner to get started"
                      : "Let them know you're thinking of them"}
                  </Text>
                </View>
              </View>
              <View style={[styles.nudgeArrow, {
                backgroundColor: canNudge ? "#FF5D8F" : colors.border,
              }]}>
                {nudgeCooldown
                  ? <Ionicons name="checkmark" size={16} color="#fff" />
                  : <Ionicons name="arrow-forward" size={16} color={canNudge ? "#fff" : colors.textMuted} />}
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Mood / status selector ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.moodHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>YOUR VIBE</Text>
              {partner?.status && (
                <View style={[styles.partnerMoodPill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 13 }}>{partner.status}</Text>
                  <Text style={[styles.partnerMoodText, { color: colors.textSub }]}>
                    {partner?.username || "Partner"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.moodGrid}>
              {MOODS.map((m) => {
                const active = profile?.status === m.emoji;
                return (
                  <TouchableOpacity
                    key={m.emoji}
                    style={[styles.moodChip, {
                      backgroundColor: active ? "#FF5D8F18" : colors.bg,
                      borderColor:     active ? "#FF5D8F"   : colors.border,
                    }]}
                    onPress={() => handleMoodSelect(m.emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: active ? "#FF5D8F" : colors.textSub }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Latest memory widget ── */}
          {latestMemory && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, overflow: "hidden" }]}>
              <LinearGradient
                colors={["#FF5D8F0C", "transparent"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>LATEST MEMORY</Text>
              <View style={styles.memoryRow}>
                <View style={[styles.memoryIconWrap, { backgroundColor: "#FF5D8F18" }]}>
                  <Ionicons name="location" size={20} color="#FF5D8F" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.memoryTitle, { color: colors.text }]} numberOfLines={1}>
                    {latestMemory.title || "Untitled memory"}
                  </Text>
                  {latestMemory.description ? (
                    <Text style={[styles.memoryDesc, { color: colors.textSub }]} numberOfLines={1}>
                      {latestMemory.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.memoryDate, { color: colors.textMuted }]}>
                    {new Date(latestMemory.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
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
  scroll: { paddingHorizontal: 18, paddingTop: 20, gap: 12 },

  // Banner
  nudgeBanner: {
    position: "absolute", top: 10, left: 16, right: 16, zIndex: 99,
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 18, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 12,
  },
  bannerIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontSize: 14, fontFamily: "Catamaran_700Bold" },
  bannerSub:   { fontSize: 12, fontFamily: "Catamaran_400Regular", marginTop: 1 },

  // Section label
  sectionLabel: { fontSize: 10, fontFamily: "Catamaran_600SemiBold", letterSpacing: 1.4, textTransform: "uppercase" },

  // Cards
  card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 14 },

  // Incoming request card
  requestCard: {
    borderRadius: 20, borderWidth: 1, padding: 16,
    gap: 12, overflow: "hidden",
  },
  requestCardInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  requestInitialBubble: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  requestInitialText: { fontSize: 18, fontFamily: "Catamaran_700Bold", color: "#fff" },
  requestTitle: { fontSize: 14, fontFamily: "Catamaran_400Regular" },
  requestSub:   { fontSize: 12, fontFamily: "Catamaran_400Regular", marginTop: 2 },
  requestActions: { flexDirection: "row", gap: 8 },
  requestBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  declineBtn: { borderWidth: 1 },
  acceptBtn:  { backgroundColor: "#FF5D8F" },
  requestBtnText: { fontSize: 14, fontFamily: "Catamaran_600SemiBold" },

  // Connection card
  connectionCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  cardAccentStrip: { position: "absolute", top: 0, left: 0, right: 0, height: 60 },
  connectionInner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 22,
  },
  personCol: { alignItems: "center", gap: 8, flex: 1 },
  personName: { fontSize: 13, fontFamily: "Catamaran_600SemiBold", maxWidth: 90, textAlign: "center" },
  avatarRing: { borderWidth: 2, alignItems: "center", justifyContent: "center" },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  statusPillEmoji: { fontSize: 13 },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7, borderWidth: 2.5,
  },
  beatCenter: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  beatDot: { width: 8, height: 8, borderRadius: 4 },
  connectionFooter: {
    borderTopWidth: 1, paddingHorizontal: 22, paddingVertical: 12,
    alignItems: "center",
  },
  connectionBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  connectionDot:  { width: 7, height: 7, borderRadius: 4 },
  connectionLabel: { fontSize: 12, fontFamily: "Catamaran_600SemiBold" },

  // Link pill
  linkPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  linkPillText: { fontSize: 13, fontFamily: "Catamaran_600SemiBold" },

  // Anniversary
  anniversaryBody: { flexDirection: "row", alignItems: "center", gap: 12 },
  daysRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  daysNumber: { fontSize: 52, fontFamily: "Catamaran_700Bold", lineHeight: 56, letterSpacing: -2 },
  daysWord:   { fontSize: 20, fontFamily: "Catamaran_400Regular", marginBottom: 8 },
  anniversaryDate: { fontSize: 13, fontFamily: "Catamaran_400Regular", marginTop: 2 },
  anniversaryIconWrap: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },

  // Empty state
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emptyIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 14, fontFamily: "Catamaran_600SemiBold" },
  emptyHint:  { fontSize: 12, fontFamily: "Catamaran_400Regular", marginTop: 2 },

  // Nudge
  nudgeCard: {
    borderRadius: 20, borderWidth: 1,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 16, gap: 14,
  },
  nudgeLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  nudgeIconWrap: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nudgeTitle: { fontSize: 15, fontFamily: "Catamaran_700Bold" },
  nudgeSub:   { fontSize: 12, fontFamily: "Catamaran_400Regular", marginTop: 2 },
  nudgeArrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  // Mood
  moodHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  partnerMoodPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  partnerMoodText: { fontSize: 11, fontFamily: "Catamaran_600SemiBold" },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  moodEmoji: { fontSize: 14 },
  moodLabel: { fontSize: 12, fontFamily: "Catamaran_600SemiBold" },

  // Memory
  memoryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  memoryIconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  memoryTitle: { fontSize: 14, fontFamily: "Catamaran_600SemiBold" },
  memoryDesc:  { fontSize: 12, fontFamily: "Catamaran_400Regular" },
  memoryDate:  { fontSize: 11, fontFamily: "Catamaran_400Regular", marginTop: 2 },
});
