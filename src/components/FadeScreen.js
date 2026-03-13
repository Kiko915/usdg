import { useRef, useCallback } from "react";
import { Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

export default function FadeScreen({ children, style }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  return (
    <Animated.View
      style={[{ flex: 1, backgroundColor: colors.bg }, style, { opacity }]}
    >
      {children}
    </Animated.View>
  );
}
