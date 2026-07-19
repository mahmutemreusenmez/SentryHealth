import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import type { LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { LucideIcon } from "lucide-react-native";
import {
  Baby,
  HeartPulse,
  Home,
  MessageCircle,
  Pill,
  User,
  Video,
} from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { PrivacyShieldScreen } from "../components/PrivacyShield";
import { useAuth } from "../context/AuthContext";
import { useBaby } from "../context/BabyContext";
import { usePrivacy } from "../context/PrivacyContext";
import type { RootStackParamList, RootTabParamList } from "../data/types";
import AuthScreen from "../screens/AuthScreen";
import BabyScreen from "../screens/BabyScreen";
import ChatScreen from "../screens/ChatScreen";
import DashboardScreen from "../screens/DashboardScreen";
import DoctorHomeScreen from "../screens/DoctorHomeScreen";
import MedicationScreen from "../screens/MedicationScreen";
import ProfileScreen from "../screens/ProfileScreen";
import VideoTriageScreen from "../screens/VideoTriageScreen";

const TABS: Record<
  keyof RootTabParamList,
  { icon: LucideIcon; label: string }
> = {
  Dashboard: { icon: Home, label: "Ana Sayfa" },
  Triage: { icon: Video, label: "Canlı Triyaj" },
  Chat: { icon: MessageCircle, label: "Sağlık Sohbeti" },
  Medication: { icon: Pill, label: "İlaç Takibi" },
  Baby: { icon: Baby, label: "Yeni Doğan" },
  Profile: { icon: User, label: "Profil" },
};

/** Web derlemesi için derin bağlantı eşlemesi. */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      Auth: "giris",
      Main: {
        screens: {
          Dashboard: "",
          Triage: "triyaj",
          Chat: "sohbet",
          Medication: "ilac-takip",
          Baby: "yeni-dogan",
          Profile: "profil",
        },
      },
      DoctorHome: "personel",
    },
  },
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  // Yeni Doğan sekmesi yalnızca profilde bebek tanımlıysa gösterilir.
  const { hasNewborn } = useBaby();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#E11D48",
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
      <Tab.Screen name="Medication" component={MedicationScreen} />
      {hasNewborn ? (
        <Tab.Screen name="Baby" component={BabyScreen} />
      ) : null}
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
      <ActivityIndicator color="#E11D48" style={{ marginTop: 12 }} />
    </View>
  );
}

export default function RootNavigator() {
  const { auth, isHydrating } = useAuth();
  const { accepted, isHydrating: privacyHydrating, accept } = usePrivacy();

  if (isHydrating || privacyHydrating) return <HydrationSplash />;

  if (!accepted) return <PrivacyShieldScreen onAccept={accept} />;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        {auth.isAuthenticated ? (
          auth.role === "doctor" ? (
            // Sağlık personeli: hasta sekmeleri yerine birleşik personel paneli.
            <Stack.Screen name="DoctorHome" component={DoctorHomeScreen} />
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
