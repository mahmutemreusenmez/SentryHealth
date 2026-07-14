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
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { loginSchema, type LoginFormValues } from "../utils/validation";

export default function AuthScreen() {
  const { auth, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nationalId: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit = handleSubmit((values) =>
    login(values.nationalId, values.password),
  );

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
              T.C. Sağlık Bakanlığı · SentryCompanion AI
            </Text>
          </View>

          {/* Giriş formu */}
          <View className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <Text className="mb-1 text-lg font-bold text-ink">Güvenli Giriş</Text>
            <Text className="mb-4 text-xs text-muted">
              Sağlık kaydınıza erişmek için e-Devlet Kapısı ile kimliğinizi
              doğrulayın.
            </Text>

            <Text className="mb-1 text-xs font-medium text-muted">
              T.C. Kimlik Numarası
            </Text>
            <Controller
              control={control}
              name="nationalId"
              render={({ field: { value, onChange, onBlur } }) => (
                <View
                  className={`mb-1 flex-row items-center rounded-xl border bg-surface px-3 ${
                    errors.nationalId ? "border-danger" : "border-line"
                  }`}
                >
                  <ShieldCheck size={18} color="#6b7280" />
                  <TextInput
                    value={value}
                    onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ""))}
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
              e-Devlet Şifresi
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <View
                  className={`mb-1 flex-row items-center rounded-xl border bg-surface px-3 ${
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
            <Pressable
              onPress={onSubmit}
              disabled={auth.isLoading}
              className={`mt-2 flex-row items-center justify-center overflow-hidden rounded-xl py-3.5 ${
                auth.isLoading ? "bg-edevlet/70" : "bg-edevlet"
              }`}
            >
              {auth.isLoading ? (
                <>
                  <ActivityIndicator color="#ffffff" />
                  <Text className="ml-2 text-sm font-bold text-white">
                    Doğrulanıyor...
                  </Text>
                </>
              ) : (
                <>
                  <View className="mr-2 h-6 w-6 items-center justify-center rounded bg-white">
                    <Text className="text-[13px] font-black text-edevlet">e</Text>
                  </View>
                  <Text className="text-sm font-bold text-white">
                    e-Devlet Kapısı ile Giriş Yap
                  </Text>
                  <LogIn size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                </>
              )}
            </Pressable>

            <Text className="mt-3 text-center text-[10px] text-muted">
              Bu bir simülasyondur; gerçek e-Devlet doğrulaması yapılmaz.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
