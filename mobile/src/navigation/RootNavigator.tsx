import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import React from "react";

import ChatScreen from "../screens/ChatScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProfileScreen from "../screens/ProfileScreen";

export type RootTabParamList = {
  Dashboard: undefined;
  Chat: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<
  keyof RootTabParamList,
  { active: keyof typeof Ionicons.glyphMap; label: string }
> = {
  Dashboard: { active: "home", label: "Ana Sayfa" },
  Chat: { active: "chatbubbles", label: "AI Asistan" },
  Profile: { active: "person", label: "Profil" },
};

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#0a7c86",
          tabBarInactiveTintColor: "#6b7280",
          tabBarStyle: {
            borderTopColor: "#e5e7eb",
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabel: ICONS[route.name].label,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={
                focused
                  ? ICONS[route.name].active
                  : (`${ICONS[route.name].active}-outline` as keyof typeof Ionicons.glyphMap)
              }
              size={size}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
