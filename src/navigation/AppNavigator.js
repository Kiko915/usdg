import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import MapScreen from "../screens/MapScreen";
import MemoriesScreen from "../screens/MemoriesScreen";
import MessagingScreen from "../screens/MessagingScreen";
import SettingsScreen from "../screens/SettingsScreen";
import TabBar from "../components/TabBar";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();

  return (
    <>
    <StatusBar style={theme === "dark" ? "light" : "dark"} />
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: false,
          sceneStyle: {
            backgroundColor: colors.bg,
            paddingTop: insets.top,
          },
        }}
      >
        <Tab.Screen name="Map"       component={MapScreen}       />
        <Tab.Screen name="Memories"  component={MemoriesScreen}  />
        <Tab.Screen name="Messaging" component={MessagingScreen} />
        <Tab.Screen name="Settings"  component={SettingsScreen}  />
      </Tab.Navigator>
    </NavigationContainer>
    </>
  );
}
