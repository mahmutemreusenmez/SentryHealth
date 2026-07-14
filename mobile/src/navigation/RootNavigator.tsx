import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import type { LucideIcon } from "lucide-react-native";
import { Home, MessageCircle, User, Video } from "lucide-react-native";
import React from "react";

import ChatScreen from "../screens/ChatScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProfileScreen from "../screens/ProfileScreen";
import VideoTriageScreen from "../screens/VideoTriageScreen";

export type RootTabParamList = {
  Dashboard: undefined;
  Triage: undefined;
  Chat: undefined;
  Profile: undefined;
};

const TABS: Record<
  keyof RootTabParamList,
  { icon: LucideIcon; label: string }
> = {
  Dashboard: { icon: Home, label: "Ana Sayfa" },
  Triage: { icon: Video, label: "Canlı Triyaj" },
  Chat: { icon: MessageCircle, label: "AI Sohbet" },
  Profile: { icon: User, label: "Profil" },
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#10b981",
          tabBarInactiveTintColor: "#6b7280",
          tabBarStyle: {
            borderTopColor: "#e5e7eb",
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabel: TABS[route.name].label,
          tabBarIcon: ({ color, size }) => {
            const Icon = TABS[route.name].icon;
            return <Icon size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Triage" component={VideoTriageScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
