import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  HeartPulse,
  Landmark,
  Lock,
  LogIn,
  ShieldCheck,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../i18n/LocaleContext";
import { successFeedback } from "../services/hapticsService";
import {
  TEST_ACCOUNTS,
  loginSchema,
  type LoginFormValues,
} from "../utils/validation";

export default function AuthScreen() {
  const { auth, login } = useAuth();
  const { t } = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  // Giriş sırasında ~1.5 sn'lik "Kimlik Doğrulanıyor…" ilerleme çubuğu.
  useEffect(() => {
    if (auth.isLoading) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    } else {
      progress.setValue(0);
    }
  }, [auth.isLoading, progress]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nationalId: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit = handleSubmit((values) => {
    successFeedback();
    login(values.nationalId, values.password);
  });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Kurumsal logolar */}
          <View className="mb-8 items-center">
            <View className="flex-row items-center">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand">
                <HeartPulse size={30} color="#ffffff" />
              </View>
              <View className="mx-3 h-10 w-px bg-line" />
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-blue">
                <Landmark size={30} color="#ffffff" />
              </View>
            </View>
            <Text className="mt-4 text-xl font-bold text-ink">e-Nabız</Text>
            <Text className="text-xs text-muted">
              T.C. Sağlık Bakanlığı · Dijital Sağlık Asistanı
            </Text>
          </View>

          {/* Giriş formu */}
          <View className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <Text className="mb-1 text-xl font-bold tracking-tight text-ink">
              {t("auth.title")}
            </Text>
            <Text className="mb-5 text-xs leading-5 text-muted">
              {t("auth.subtitle")}
            </Text>

            <Text className="mb-1 text-xs font-medium text-muted">
              {t("auth.tc")}
            </Text>
            <Controller
              control={control}
              name="nationalId"
              render={({ field: { value, onChange, onBlur } }) => (
                <View
                  className={`mb-1 flex-row items-center rounded-2xl border bg-surface px-4 ${
                    errors.nationalId ? "border-danger" : "border-line"
                  }`}
                >
                  <ShieldCheck size={18} color="#6b7280" />
                  <TextInput
                    value={value}
                    onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ""))}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={11}
                    placeholder="XXXXXXXXXXX"
                    placeholderTextColor="#9ca3af"
                    className="ml-2 flex-1 py-3 text-ink"
                    editable={!auth.isLoading}
                  />
                </View>
              )}
            />
            {errors.nationalId ? (
              <Text className="mb-2 text-[11px] text-danger">
                {errors.nationalId.message}
              </Text>
            ) : (
              <View className="mb-2" />
            )}

            <Text className="mb-1 text-xs font-medium text-muted">
              {t("auth.password")}
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <View
                  className={`mb-1 flex-row items-center rounded-2xl border bg-surface px-4 ${
                    errors.password ? "border-danger" : "border-line"
                  }`}
                >
                  <Lock size={18} color="#6b7280" />
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    className="ml-2 flex-1 py-3 text-ink"
                    editable={!auth.isLoading}
                    onSubmitEditing={onSubmit}
                    returnKeyType="go"
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={8}
                    accessibilityLabel="Şifreyi göster/gizle"
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#6b7280" />
                    ) : (
                      <Eye size={18} color="#6b7280" />
                    )}
                  </Pressable>
                </View>
              )}
            />
            {errors.password ? (
              <Text className="mb-2 text-[11px] text-danger">
                {errors.password.message}
              </Text>
            ) : (
              <View className="mb-2" />
            )}

            {auth.error ? (
              <Text className="mb-2 text-[11px] text-danger">{auth.error}</Text>
            ) : null}

            {/* e-Devlet Kapısı ile Giriş Yap butonu */}
            <PressableScale
              onPress={onSubmit}
              disabled={auth.isLoading}
              accessibilityRole="button"
              accessibilityLabel="e-Devlet Kapısı ile giriş yap"
              className={`mt-2 items-center justify-center overflow-hidden rounded-2xl py-4 shadow-sm ${
                auth.isLoading ? "bg-edevlet/80" : "bg-edevlet"
              }`}
            >
              {auth.isLoading ? (
                <View className="w-full items-center">
                  <Text className="text-sm font-bold text-white">
                    {t("auth.verifying")}
                  </Text>
                  <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                    <Animated.View
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: "#ffffff",
                        width: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["8%", "100%"],
                        }),
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center justify-center">
                  <View className="mr-2 h-6 w-6 items-center justify-center rounded bg-white">
                    <Text className="text-[13px] font-black text-edevlet">e</Text>
                  </View>
                  <Text className="text-sm font-bold text-white">
                    {t("auth.login")}
                  </Text>
                  <LogIn size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                </View>
              )}
            </PressableScale>

          </View>

          {/* Demo/test giriş bilgileri */}
          <View className="mt-4 rounded-3xl border border-line bg-white p-5">
            <Text className="mb-1 text-xs font-bold text-ink">
              {t("auth.testInfo")}
            </Text>
            <Text className="mb-3 text-[11px] leading-4 text-muted">
              {t("auth.testHint")}
            </Text>
            {TEST_ACCOUNTS.map((account) => (
              <View
                key={account.nationalId}
                className="mb-2 flex-row items-center justify-between rounded-2xl bg-brand-light px-4 py-3"
              >
                <View>
                  <View className="mb-0.5 flex-row items-center">
                    <View
                      className={`mr-2 rounded-full px-2 py-0.5 ${
                        account.role === "doctor" ? "bg-blue" : "bg-brand"
                      }`}
                    >
                      <Text className="text-[9px] font-bold text-white">
                        {account.role === "doctor"
                          ? t("auth.roleDoctor")
                          : t("auth.rolePatient")}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-medium text-muted">
                      {t("auth.tc")}
                    </Text>
                  </View>
                  <Text className="text-[13px] font-bold text-ink">
                    {account.nationalId}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] font-medium text-muted">
                    {t("auth.password")}
                  </Text>
                  <Text className="text-[13px] font-bold text-ink">
                    {account.password}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
