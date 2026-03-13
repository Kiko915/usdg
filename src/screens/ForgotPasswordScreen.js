import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";

export default function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { showToast } = useToast();

  const handleReset = async () => {
    if (!email) {
      showToast({ type: "error", title: "Email required", message: "Please enter your email address." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) showToast({ type: "error", title: "Request failed", message: error.message });
      else setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
        <View style={styles.inner}>
          {/* Back */}
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>

          {/* Logo */}
          <Image
            source={require("../../assets/usdg-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {sent ? (
            /* ── Success state ── */
            <View style={styles.successWrap}>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successBody}>
                We've sent a password reset link to{"\n"}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <TouchableOpacity onPress={onBack} style={styles.cta} activeOpacity={0.88}>
                <Text style={styles.ctaText}>Return to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form state ── */
            <>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Enter the email associated with your account and we'll send you a reset link.
              </Text>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Email address</Text>
                <TextInput
                  style={[styles.input, focusedField === "email" && styles.inputFocused]}
                  placeholder="name@example.com"
                  placeholderTextColor="#3D3D3D"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <TouchableOpacity
                style={[styles.cta, loading && styles.ctaDisabled]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaText}>Send reset link</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
    </View>
  );
}

const ACCENT = "#FF5D8F";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 48,
  },

  // ── Back ──
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 40,
  },
  backArrow: {
    fontSize: 18,
    color: "#555555",
  },
  backText: {
    fontSize: 14,
    color: "#555555",
    fontFamily: "Catamaran_400Regular",
  },

  // ── Logo ──
  logo: {
    width: 44,
    height: 44,
    marginBottom: 32,
  },

  // ── Heading ──
  title: {
    fontSize: 26,
    fontFamily: "Catamaran_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Catamaran_400Regular",
    color: "#555555",
    lineHeight: 22,
    marginBottom: 36,
  },

  // ── Field ──
  fieldWrap: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Catamaran_600SemiBold",
    color: "#555555",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "Catamaran_400Regular",
  },
  inputFocused: {
    borderColor: ACCENT,
    backgroundColor: "#161616",
  },
  errorText: {
    fontSize: 13,
    color: "#FF5D8F",
    fontFamily: "Catamaran_400Regular",
    marginTop: 8,
  },

  // ── CTA ──
  cta: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Catamaran_700Bold",
    letterSpacing: 0.2,
  },

  // ── Success ──
  successWrap: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 80,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 22,
    color: ACCENT,
    fontWeight: "700",
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "Catamaran_700Bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  successBody: {
    fontSize: 14,
    fontFamily: "Catamaran_400Regular",
    color: "#555555",
    lineHeight: 22,
    marginBottom: 36,
  },
  successEmail: {
    color: "#FFFFFF",
    fontFamily: "Catamaran_600SemiBold",
  },
});
