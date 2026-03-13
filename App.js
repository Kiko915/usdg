import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import {
  useFonts,
  Catamaran_700Bold,
  Catamaran_600SemiBold,
  Catamaran_400Regular,
} from "@expo-google-fonts/catamaran";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "./src/lib/supabase";
import AuthScreen from "./src/screens/AuthScreen";
import AppNavigator from "./src/navigation/AppNavigator";
import { ToastProvider } from "./src/context/ToastContext";

export default function App() {
  const [fontsLoaded] = useFonts({
    Catamaran_700Bold,
    Catamaran_600SemiBold,
    Catamaran_400Regular,
  });
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (sessionLoading || !fontsLoaded) return <View style={styles.splash} />;

  return (
    <SafeAreaProvider>
      <ToastProvider>
        {session ? <AppNavigator /> : <AuthScreen />}
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: "#0A0A0A" },
});
