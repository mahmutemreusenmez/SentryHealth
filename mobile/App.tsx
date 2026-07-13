import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";
import NotificationBanner from "./src/components/NotificationBanner";
import { PatientProvider } from "./src/context/PatientContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <PatientProvider>
        <StatusBar style="light" backgroundColor="#0a7c86" />
        <RootNavigator />
        <NotificationBanner />
      </PatientProvider>
    </SafeAreaProvider>
  );
}
