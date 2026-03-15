import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONFETTI_COLORS = ["#FF5D8F", "#FF8FAD", "#6C8EFF", "#FFD700", "#FF6B6B", "#C0C0C0"];
const CONFETTI_COUNT = 50;

function ConfettiPiece({ delay, color, startX }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const randomDuration = 2000 + Math.random() * 1500;
    const randomDistance = 100 + Math.random() * 150;
    const swayDistance = (Math.random() - 0.5) * 100;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 800,
          duration: randomDuration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: startX + swayDistance,
          duration: randomDuration / 2,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: startX - swayDistance / 2,
          duration: randomDuration / 2,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rotate, {
        toValue: 1,
        duration: randomDuration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        { backgroundColor: color },
        {
          transform: [
            { translateY },
            { translateX },
            { rotate: spin },
          ],
          opacity,
        },
      ]}
    />
  );
}

export default function Confetti() {
  const particles = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    startX: Math.random() * SCREEN_WIDTH,
    delay: Math.random() * 500,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiPiece
          key={p.id}
          color={p.color}
          startX={p.startX}
          delay={p.delay}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  confetti: {
    position: "absolute",
    width: 10,
    height: 10,
    top: 0,
    borderRadius: 2,
  },
});
