import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Image,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useProfile } from "../hooks/useProfile";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import { useModal } from "../context/ModalContext";
import FadeScreen from "../components/FadeScreen";
import ScreenHeader from "../components/ScreenHeader";

const APP_VERSION = "1.0.0";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getInitials(email) {
  return email ? email.charAt(0).toUpperCase() : "?";
}

function SectionLabel({ label, colors }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>{label}</Text>
  );
}

function Row({ icon, iconBg, iconColor = "#FFFFFF", label, value, onPress, destructive, last, right, colors }) {
  const inner = (
    <View style={[
      styles.row,
      { backgroundColor: colors.surface },
      !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg ?? colors.iconBgDefault }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[
          styles.rowLabel,
          { color: destructive ? "#FF3B5C" : colors.text },
          destructive && styles.rowLabelDestructive,
        ]}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {right ?? (
          <>
            {value ? <Text style={[styles.rowValue, { color: colors.rowValue }]}>{value}</Text> : null}
            {onPress ? <Ionicons name="chevron-forward" size={14} color={colors.chevron} /> : null}
          </>
        )}
      </View>
    </View>
  );
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>
    : inner;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { showModal } = useModal();
  const { colors, theme, toggleTheme } = useTheme();
  const { profile, loading, saving, updateProfile, pickAndUploadAvatar, getAvatarUrl, refetch } = useProfile();
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");

  const loadUser = () =>
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

  useEffect(() => { loadUser(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUser(), refetch()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
  }, [profile?.username]);

  const handleSave = async () => {
    if (username.trim().length < 3) {
      showToast({ type: "error", title: "Username too short", message: "Username must be at least 3 characters." });
      return;
    }
    const { error } = await updateProfile({ username: username.trim() });
    if (error) {
      showToast({ type: "error", title: "Save failed", message: error.message ?? error });
    } else {
      showToast({ type: "success", title: "Profile updated", message: "Your changes have been saved." });
      setEditing(false);
    }
  };

  const handleAvatarPress = async () => {
    const result = await pickAndUploadAvatar();
    if (result?.error) {
      showToast({ type: "error", title: "Upload failed", message: result.error });
    } else if (!result?.canceled) {
      showToast({ type: "success", title: "Photo updated" });
    }
  };

  const handleSignOut = () => {
    showModal({
      title: "Sign out",
      message: "Are you sure you want to sign out?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => supabase.auth.signOut() },
      ],
    });
  };

  const email = user?.email ?? "—";
  const memberSince = formatDate(user?.created_at);
  const provider = user?.app_metadata?.provider ?? "email";
  const userId = user?.id ? `${user.id.slice(0, 8)}…` : "—";
  const avatarUrl = getAvatarUrl();
  const displayName = profile?.username || email;

  const headerRight = !editing ? (
    <TouchableOpacity
      style={[styles.editBtn, { borderColor: colors.borderStrong }]}
      onPress={() => setEditing(true)}
      activeOpacity={0.7}
    >
      <Text style={[styles.editBtnText, { color: colors.textSub }]}>Edit profile</Text>
    </TouchableOpacity>
  ) : (
    <View style={styles.editActions}>
      <TouchableOpacity
        onPress={() => { setEditing(false); setUsername(profile?.username ?? ""); }}
        style={styles.cancelBtn}
        activeOpacity={0.7}
      >
        <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleSave}
        style={styles.saveBtn}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.saveBtnText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );

  return (
    <FadeScreen>
      <ScreenHeader title="Settings" right={headerRight} />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.bg }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF5D8F"
            colors={["#FF5D8F"]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* ── Profile card ── */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={editing ? handleAvatarPress : undefined}
            activeOpacity={editing ? 0.75 : 1}
            style={styles.avatarWrap}
          >
            {loading ? (
              <View style={styles.avatar}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(email)}</Text>
              </View>
            )}
            {editing && (
              <View style={styles.avatarOverlay}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="camera" size={18} color="#fff" />}
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            {editing ? (
              <TextInput
                style={[styles.usernameInput, { color: colors.text, borderBottomColor: colors.accent }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
            ) : (
              <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
            )}
            <Text style={[styles.profileSub, { color: colors.profileSub }]}>
              Member since {memberSince}
            </Text>
          </View>
        </View>

        {/* ── Appearance ── */}
        <SectionLabel label="Appearance" colors={colors} />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon={theme === "dark" ? "moon" : "sunny"}
            iconBg={theme === "dark" ? "#12121F" : "#FFF8E6"}
            iconColor={theme === "dark" ? "#9B8FFF" : "#F59E0B"}
            label="Dark mode"
            colors={colors}
            last
            right={
              <Switch
                value={theme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.borderStrong, true: "#FF5D8F" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.borderStrong}
              />
            }
          />
        </View>

        {/* ── Account ── */}
        <SectionLabel label="Account" colors={colors} />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="at-outline"
            iconBg="#141424"
            iconColor="#6C8EFF"
            label="Username"
            value={profile?.username ?? "Not set"}
            colors={colors}
          />
          <Row
            icon="mail-outline"
            iconBg="#1A1A2E"
            iconColor="#6C8EFF"
            label="Email"
            value={email}
            colors={colors}
          />
          <Row
            icon="finger-print-outline"
            iconBg="#1A1A1A"
            iconColor="#888888"
            label="User ID"
            value={userId}
            colors={colors}
          />
          <Row
            icon="shield-checkmark-outline"
            iconBg="#0A1A10"
            iconColor="#22C55E"
            label="Sign-in method"
            value={provider.charAt(0).toUpperCase() + provider.slice(1)}
            colors={colors}
            last
          />
        </View>

        {/* ── About ── */}
        <SectionLabel label="About" colors={colors} />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="heart-outline"
            iconBg="#1A0D12"
            iconColor="#FF5D8F"
            label="Us, Digitized"
            value={`v${APP_VERSION}`}
            colors={colors}
          />
          <Row
            icon="map-outline"
            iconBg="#1A1200"
            iconColor="#F59E0B"
            label="Your memories, mapped."
            colors={colors}
            last
          />
        </View>

        {/* ── Session ── */}
        <SectionLabel label="Session" colors={colors} />
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="log-out-outline"
            iconBg="#1A0C10"
            iconColor="#FF3B5C"
            label="Sign out"
            destructive
            onPress={handleSignOut}
            colors={colors}
            last
          />
        </View>
      </ScrollView>
    </FadeScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // ── Header actions ──
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: "Catamaran_600SemiBold",
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "Catamaran_400Regular",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FF5D8F",
    minWidth: 52,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: "Catamaran_700Bold",
    color: "#FFFFFF",
  },

  // ── Profile card ──
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
    gap: 14,
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF5D8F",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "Catamaran_700Bold",
    color: "#FFFFFF",
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1, gap: 4 },
  displayName: {
    fontSize: 16,
    fontFamily: "Catamaran_600SemiBold",
  },
  usernameInput: {
    fontSize: 16,
    fontFamily: "Catamaran_400Regular",
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  profileSub: {
    fontSize: 12,
    fontFamily: "Catamaran_400Regular",
  },

  // ── Section ──
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Catamaran_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },

  // ── Row ──
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "Catamaran_400Regular",
    flexShrink: 1,
  },
  rowLabelDestructive: {
    fontFamily: "Catamaran_600SemiBold",
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Catamaran_400Regular",
    maxWidth: 160,
    textAlign: "right",
  },
});
