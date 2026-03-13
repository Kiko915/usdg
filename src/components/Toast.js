import { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Easing,
} from "react-native";

const CONFIG = {
  error: {
    border: "#FF3B5C",
    bg:     "#1A0C10",
    label:  "#FF3B5C",
    icon:   "✕",
  },
  success: {
    border: "#22C55E",
    bg:     "#0A1A10",
    label:  "#22C55E",
    icon:   "✓",
  },
  info: {
    border: "#FF5D8F",
    bg:     "#1A0D12",
    label:  "#FF5D8F",
    icon:   "i",
  },
  warning: {
    border: "#F59E0B",
    bg:     "#1A1200",
    label:  "#F59E0B",
    icon:   "!",
  },
};

export default function Toast({ toast, onHide }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(dismiss, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 260,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onHide);
  };

  if (!toast) return null;

  const c = CONFIG[toast.type] ?? CONFIG.info;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: c.bg, borderColor: c.border },
        { transform: [{ translateY }], opacity },
      ]}
    >
      {/* Icon */}
      <Animated.View style={[styles.iconWrap, { borderColor: c.border }]}>
        <Text style={[styles.icon, { color: c.border }]}>{c.icon}</Text>
      </Animated.View>

      {/* Text */}
      <Animated.View style={styles.textWrap}>
        {toast.title && (
          <Text style={[styles.title, { color: c.label }]}>{toast.title}</Text>
        )}
        {toast.message && (
          <Text style={styles.message} numberOfLines={3}>
            {toast.message}
          </Text>
        )}
      </Animated.View>

      {/* Dismiss */}
      <TouchableOpacity onPress={dismiss} style={styles.closeBtn} activeOpacity={0.7}>
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 12,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: {
    fontSize: 11,
    fontWeight: "800",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: "Catamaran_700Bold",
    letterSpacing: 0.1,
  },
  message: {
    fontSize: 13,
    fontFamily: "Catamaran_400Regular",
    color: "#888888",
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    flexShrink: 0,
  },
  closeIcon: {
    fontSize: 11,
    color: "#444444",
    fontWeight: "700",
  },
});
