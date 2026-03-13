import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FadeScreen from "../components/FadeScreen";
import ScreenHeader from "../components/ScreenHeader";
import { useTheme } from "../context/ThemeContext";

export default function MemoriesScreen() {
  const { colors } = useTheme();

  return (
    <FadeScreen>
      <ScreenHeader title="Memories" />
      <View style={styles.body}>
        <Ionicons name="heart-outline" size={40} color={colors.border} />
        <Text style={[styles.title, { color: colors.text }]}>No memories yet</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your memory feed is coming soon.
        </Text>
      </View>
    </FadeScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: "Catamaran_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Catamaran_400Regular",
  },
});
