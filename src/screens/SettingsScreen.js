import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useProfile } from "../hooks/useProfile";
import { useToast } from "../context/ToastContext";
import FadeScreen from "../components/FadeScreen";

const APP_VERSION = "1.0.0";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getInitials(email) {
  return email ? email.charAt(0).toUpperCase() : "?";
}

function SectionLabel({ label }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Row({ icon, iconBg, iconColor = "#FFFFFF", label, value, onPress, destructive, last }) {
  const inner = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg ?? "#1E1E1E" }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {onPress ? <Ionicons name="chevron-forward" size={14} color="#333333" /> : null}
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

  // Sync username field when profile loads
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
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  };

  const email = user?.email ?? "—";
  const memberSince = formatDate(user?.created_at);
  const provider = user?.app_metadata?.provider ?? "email";
  const userId = user?.id ? `${user.id.slice(0, 8)}…` : "—";
  const avatarUrl = getAvatarUrl();
  const displayName = profile?.username || email;

  return (
    <FadeScreen>
      <ScrollView
        style={styles.root}
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
            progressBackgroundColor="#111111"
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Settings</Text>
          {!editing ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditing(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>Edit profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={() => { setEditing(false); setUsername(profile?.username ?? ""); }}
                style={styles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
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
          )}
        </View>

        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          {/* Avatar */}
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

          {/* Name + meta */}
          <View style={styles.profileInfo}>
            {editing ? (
              <TextInput
                style={styles.usernameInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#3D3D3D"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
            ) : (
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
            )}
            <Text style={styles.profileSub}>Member since {memberSince}</Text>
          </View>
        </View>

        {/* ── Account ── */}
        <SectionLabel label="Account" />
        <View style={styles.section}>
          <Row
            icon="at-outline"
            iconBg="#141424"
            iconColor="#6C8EFF"
            label="Username"
            value={profile?.username ?? "Not set"}
          />
          <Row
            icon="mail-outline"
            iconBg="#1A1A2E"
            iconColor="#6C8EFF"
            label="Email"
            value={email}
          />
          <Row
            icon="finger-print-outline"
            iconBg="#1A1A1A"
            iconColor="#888888"
            label="User ID"
            value={userId}
          />
          <Row
            icon="shield-checkmark-outline"
            iconBg="#0A1A10"
            iconColor="#22C55E"
            label="Sign-in method"
            value={provider.charAt(0).toUpperCase() + provider.slice(1)}
            last
          />
        </View>

        {/* ── About ── */}
        <SectionLabel label="About" />
        <View style={styles.section}>
          <Row
            icon="heart-outline"
            iconBg="#1A0D12"
            iconColor="#FF5D8F"
            label="Us, Digitized"
            value={`v${APP_VERSION}`}
          />
          <Row
            icon="map-outline"
            iconBg="#1A1200"
            iconColor="#F59E0B"
            label="Your memories, mapped."
            last
          />
        </View>

        {/* ── Session ── */}
        <SectionLabel label="Session" />
        <View style={styles.section}>
          <Row
            icon="log-out-outline"
            iconBg="#1A0C10"
            iconColor="#FF3B5C"
            label="Sign out"
            destructive
            onPress={handleSignOut}
            last
          />
        </View>
      </ScrollView>
    </FadeScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  content: { paddingHorizontal: 20 },

  // ── Header ──
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontFamily: "Catamaran_700Bold",
    color: "#FFFFFF",
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: "Catamaran_600SemiBold",
    color: "#888888",
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
    color: "#555555",
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
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
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
    color: "#FFFFFF",
  },
  usernameInput: {
    fontSize: 16,
    fontFamily: "Catamaran_400Regular",
    color: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#FF5D8F",
    paddingVertical: 2,
  },
  profileSub: {
    fontSize: 12,
    fontFamily: "Catamaran_400Regular",
    color: "#555555",
  },

  // ── Section ──
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Catamaran_600SemiBold",
    color: "#444444",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: "#111111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E1E1E",
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
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
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
    color: "#CCCCCC",
    flexShrink: 1,
  },
  rowLabelDestructive: {
    color: "#FF3B5C",
    fontFamily: "Catamaran_600SemiBold",
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Catamaran_400Regular",
    color: "#444444",
    maxWidth: 160,
    textAlign: "right",
  },
});
