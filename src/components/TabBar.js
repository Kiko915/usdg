import { useRef, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

const TABS = [
  { key: "Map",       icon: "map-outline",        activeIcon: "map"        },
  { key: "Memories",  icon: "heart-outline",      activeIcon: "heart"      },
  { key: "Add",       icon: "add",                center: true             },
  { key: "Messaging", icon: "chatbubble-outline", activeIcon: "chatbubble" },
  { key: "Settings",  icon: "settings-outline",   activeIcon: "settings"   },
];

function TabItem({ tab, isFocused, onPress, colors }) {
  const scale = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.78,
        duration: 90,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  useEffect(() => {
    Animated.timing(dotOpacity, {
      toValue: isFocused ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  const iconName = isFocused ? tab.activeIcon : tab.icon;

  return (
    <TouchableOpacity style={styles.tab} onPress={handlePress} activeOpacity={1}>
      <Animated.View style={{ transform: [{ scale }], alignItems: "center", gap: 4 }}>
        <Ionicons
          name={iconName}
          size={22}
          color={isFocused ? colors.accent : colors.tabInactive}
        />
        <Animated.View
          style={[styles.activeDot, { opacity: dotOpacity, backgroundColor: colors.accent }]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

function CenterButton({ onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.82,
        duration: 90,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <View style={styles.centerWrap}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <Animated.View style={[styles.centerBtn, { transform: [{ scale }] }]}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 12 }]}>
      <LinearGradient
        colors={["transparent", colors.bg]}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.tabBar,
            borderColor: colors.tabBarBorder,
          },
        ]}
      >
        {TABS.map((tab, index) => {
          if (tab.center) {
            return (
              <CenterButton
                key={tab.key}
                onPress={() => navigation.navigate("Map")}
              />
            );
          }

          const navIndex = index > 2 ? index - 1 : index;
          const isFocused = state.index === navIndex;

          return (
            <TabItem
              key={tab.key}
              tab={tab}
              isFocused={isFocused}
              onPress={() => navigation.navigate(tab.key)}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "transparent",
    pointerEvents: "box-none",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    pointerEvents: "none",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 40,
    paddingHorizontal: 8,
    paddingVertical: 10,
    width: "88%",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
  },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FF5D8F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5D8F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: "#FF5D8F",
  },
});
