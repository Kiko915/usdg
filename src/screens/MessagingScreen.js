import { Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FadeScreen from "../components/FadeScreen";

export default function MessagingScreen() {
  return (
    <FadeScreen style={styles.container}>
      <Ionicons name="chatbubble-outline" size={40} color="#2A2A2A" />
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>Your conversations will appear here.</Text>
    </FadeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: "Catamaran_700Bold",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Catamaran_400Regular",
    color: "#444444",
  },
});
