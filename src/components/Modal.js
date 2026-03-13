import { useEffect, useRef } from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function Modal({ visible, title, message, buttons = [], onDismiss }) {
  const { colors } = useTheme();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale   = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 7,
          tension: 160,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      cardScale.setValue(0.92);
    }
  }, [visible]);

  const getButtonColor = (style) => {
    if (style === "destructive") return "#FF3B5C";
    if (style === "cancel") return colors.textSub;
    return colors.accent;
  };

  const getButtonWeight = (style) => {
    if (style === "cancel") return "Catamaran_400Regular";
    return "Catamaran_700Bold";
  };

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      {/* Card */}
      <View style={styles.centerer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Text */}
          <View style={styles.body}>
            {title ? (
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            ) : null}
            {message ? (
              <Text style={[styles.message, { color: colors.textSub }]}>{message}</Text>
            ) : null}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Buttons */}
          <View style={[styles.buttonRow, buttons.length > 2 && styles.buttonColumn]}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.button,
                  buttons.length === 2 && i === 0 && {
                    borderRightWidth: 1,
                    borderRightColor: colors.border,
                  },
                  buttons.length > 2 && i < buttons.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  onDismiss();
                  btn.onPress?.();
                }}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: getButtonColor(btn.style),
                      fontFamily: getButtonWeight(btn.style),
                    },
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  centerer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: "Catamaran_700Bold",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    fontFamily: "Catamaran_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  divider: {
    height: 1,
  },
  buttonRow: {
    flexDirection: "row",
  },
  buttonColumn: {
    flexDirection: "column",
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
