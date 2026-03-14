import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import MapScreen from "../screens/MapScreen";
import MemoriesScreen from "../screens/MemoriesScreen";
import UsDashboardScreen from "../screens/UsDashboardScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LinkPartnerScreen from "../screens/LinkPartnerScreen";
import TabBar from "../components/TabBar";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
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
      <Tab.Screen name="Map"       component={MapScreen}         />
      <Tab.Screen name="Memories"  component={MemoriesScreen}    />
      <Tab.Screen name="Us"        component={UsDashboardScreen} />
      <Tab.Screen name="Settings"  component={SettingsScreen}    />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs"        component={TabNavigator}      />
          <Stack.Screen
            name="LinkPartner"
            component={LinkPartnerScreen}
            options={{ animation: "slide_from_bottom" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
