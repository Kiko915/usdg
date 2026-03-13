import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const DARK = {
  bg: "#0A0A0A",
  surface: "#111111",
  border: "#1A1A1A",
  borderStrong: "#2A2A2A",
  text: "#FFFFFF",
  textSub: "#888888",
  textMuted: "#444444",
  accent: "#FF5D8F",
  tabBar: "#111111",
  tabBarBorder: "#1E1E1E",
  tabInactive: "#444444",
  sectionLabel: "#444444",
  rowValue: "#444444",
  chevron: "#333333",
  iconBgDefault: "#1E1E1E",
  profileSub: "#555555",
  mapTiles: "dark",
};

export const LIGHT = {
  bg: "#F2F2F7",
  surface: "#FFFFFF",
  border: "#E5E5EA",
  borderStrong: "#D1D1D6",
  text: "#1C1C1E",
  textSub: "#6C6C70",
  textMuted: "#AEAEB2",
  accent: "#FF5D8F",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E5E5EA",
  tabInactive: "#AEAEB2",
  sectionLabel: "#AEAEB2",
  rowValue: "#6C6C70",
  chevron: "#C7C7CC",
  iconBgDefault: "#F0F0F5",
  profileSub: "#6C6C70",
  mapTiles: "light",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // Load theme for current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadTheme(session.user.id);
    });

    // React to sign in / sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadTheme(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setTheme("dark");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadTheme = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("theme")
      .eq("id", userId)
      .single();
    setTheme(data?.theme ?? "dark");
  };

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .upsert({ id: user.id, theme: next }, { onConflict: "id" });
    }
  };

  const colors = theme === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
