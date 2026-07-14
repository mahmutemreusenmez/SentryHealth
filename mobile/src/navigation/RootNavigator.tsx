import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { LucideIcon } from "lucide-react-native";
import { HeartPulse, Home, MessageCircle, User, Video } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import AuthScreen from "../screens/AuthScreen";
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

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
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
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
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
  );
}

function HydrationSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand">
        <HeartPulse size={30} color="#ffffff" />
      </View>
      <Text className="mt-4 text-base font-bold text-ink">e-Nabız</Text>
      <ActivityIndicator color="#10b981" style={{ marginTop: 12 }} />
    </View>
  );
}

export default function RootNavigator() {
  const { auth, isHydrating } = useAuth();

  if (isHydrating) return <HydrationSplash />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        {auth.isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
