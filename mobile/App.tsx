import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";
import NotificationBanner from "./src/components/NotificationBanner";
import OfflineBar from "./src/components/OfflineBar";
import { AuthProvider } from "./src/context/AuthContext";
import { PatientProvider } from "./src/context/PatientContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PatientProvider>
          <StatusBar style="light" backgroundColor="#10b981" />
          <RootNavigator />
          <OfflineBar />
          <NotificationBanner />
        </PatientProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
