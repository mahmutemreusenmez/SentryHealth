import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "./global.css";
import NotificationBanner from "./src/components/NotificationBanner";
import OfflineBar from "./src/components/OfflineBar";
import { AccessibilityProvider } from "./src/context/AccessibilityContext";
import { AuthProvider } from "./src/context/AuthContext";
import { BabyProvider } from "./src/context/BabyContext";
import { PatientProvider } from "./src/context/PatientContext";
import { PrivacyProvider } from "./src/context/PrivacyContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AccessibilityProvider>
        <PrivacyProvider>
          <AuthProvider>
            <PatientProvider>
              <BabyProvider>
                <StatusBar style="light" backgroundColor="#00875A" />
                <RootNavigator />
                <OfflineBar />
                <NotificationBanner />
              </BabyProvider>
            </PatientProvider>
          </AuthProvider>
        </PrivacyProvider>
      </AccessibilityProvider>
    </SafeAreaProvider>
  );
}
