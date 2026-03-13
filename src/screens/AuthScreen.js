import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  Easing,
} from "react-native";
import { supabase } from "../lib/supabase";
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import { useToast } from "../context/ToastContext";

const DURATION_OUT = 160;
const DURATION_IN  = 220;

export default function AuthScreen() {
  const [screen, setScreen] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { showToast } = useToast();

  const opacity   = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  // direction: "forward" (→ forgot) | "back" (→ login)
  const navigateTo = (target, direction = "forward") => {
    const exitX  = direction === "forward" ? -24 : 24;
    const enterX = direction === "forward" ?  24 : -24;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: DURATION_OUT,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: exitX,
        duration: DURATION_OUT,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      translateX.setValue(enterX);
      setScreen(target);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: DURATION_IN,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: DURATION_IN,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showToast({ type: "error", title: "Required fields", message: "Please enter your email and password." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) showToast({ type: "error", title: "Authentication failed", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const animStyle = { opacity, transform: [{ translateX }] };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[{ flex: 1 }, animStyle]}>
          {screen === "forgot" ? (
            <ForgotPasswordScreen onBack={() => navigateTo("login", "back")} />
          ) : (
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Wordmark ── */}
              <View style={styles.wordmarkArea}>
                <Image
                  source={require("../../assets/usdg-logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.appName}>Us, Digitized</Text>
                <Text style={styles.tagline}>Your shared memories, mapped.</Text>
              </View>

              {/* ── Form ── */}
              <View style={styles.form}>
                {/* Mode row */}
                <View style={styles.modeRow}>
                  <View style={[styles.modeBtn, styles.modeBtnActive]}>
                    <Text style={[styles.modeBtnText, styles.modeBtnTextActive]}>
                      Sign in
                    </Text>
                  </View>
                  <View style={styles.modeBtn}>
                    <Text style={styles.modeBtnText}>Create account</Text>
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  </View>
                </View>

                {/* Email */}
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

                {/* Password */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.inputWithToggle,
                        focusedField === "password" && styles.inputFocused,
                      ]}
                      placeholder="••••••••••••"
                      placeholderTextColor="#3D3D3D"
                      secureTextEntry={!showPassword}
                      autoComplete="current-password"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity
                      style={styles.visibilityToggle}
                      onPress={() => setShowPassword((v) => !v)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.visibilityToggleText}>
                        {showPassword ? "Hide" : "Show"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* CTA */}
                <TouchableOpacity
                  style={[styles.cta, loading && styles.ctaDisabled]}
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.ctaText}>Continue</Text>
                  )}
                </TouchableOpacity>

                {/* Forgot */}
                <TouchableOpacity
                  onPress={() => navigateTo("forgot", "forward")}
                  style={styles.forgotWrap}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* ── Footer ── */}
              <Text style={styles.footer}>
                By continuing, you agree to our{" "}
                <Text style={styles.footerLink}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Text>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </>
  );
}

const ACCENT = "#FF5D8F";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 48,
    justifyContent: "center",
  },

  // ── Wordmark ──
  wordmarkArea: {
    paddingTop: 72,
    paddingBottom: 48,
  },
  logo: {
    width: 52,
    height: 52,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Catamaran_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: "#555555",
    fontFamily: "Catamaran_400Regular",
    letterSpacing: 0.1,
  },

  // ── Form ──
  form: {
    marginBottom: 32,
  },
  modeRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
    marginBottom: 32,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginRight: 24,
    gap: 8,
  },
  modeBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  modeBtnText: {
    fontSize: 15,
    fontFamily: "Catamaran_600SemiBold",
    color: "#444444",
  },
  modeBtnTextActive: {
    color: "#FFFFFF",
  },

  // ── Fields ──
  fieldWrap: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Catamaran_600SemiBold",
    color: "#555555",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
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
  inputWithToggle: {
    paddingRight: 72,
  },
  inputFocused: {
    borderColor: ACCENT,
    backgroundColor: "#161616",
  },
  visibilityToggle: {
    position: "absolute",
    right: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  visibilityToggleText: {
    fontSize: 13,
    fontFamily: "Catamaran_600SemiBold",
    color: "#555555",
  },

  // ── CTA ──
  cta: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Catamaran_700Bold",
    letterSpacing: 0.2,
  },

  // ── Coming soon badge ──
  comingSoonBadge: {
    backgroundColor: "#1E1E1E",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: "Catamaran_600SemiBold",
    color: "#555555",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── Forgot ──
  forgotWrap: {
    alignItems: "flex-end",
    marginTop: 16,
  },
  forgotText: {
    fontSize: 13,
    color: "#555555",
    fontFamily: "Catamaran_400Regular",
  },

  // ── Footer ──
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#333333",
    fontFamily: "Catamaran_400Regular",
    lineHeight: 18,
  },
  footerLink: {
    color: "#555555",
  },
});
