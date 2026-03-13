import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function ScreenHeader({ title, right }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.bg, borderBottomColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Catamaran_700Bold",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
