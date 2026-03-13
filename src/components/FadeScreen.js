import { useRef, useCallback } from "react";
import { Animated, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

export default function FadeScreen({ children, style }) {
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
    <Animated.View style={[styles.root, style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
});
