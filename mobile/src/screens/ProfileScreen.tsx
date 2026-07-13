import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, PriorityBadge, SectionHeader } from "../components/ui";
import { usePatient } from "../context/PatientContext";
import {
  CHRONIC_CONDITIONS,
  type ChronicCondition,
  type Gender,
} from "../data/types";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Kadın" },
  { value: "male", label: "Erkek" },
  { value: "unspecified", label: "Belirtilmedi" },
];

function isValidNationalId(id: string): boolean {
  return /^\d{11}$/.test(id) && id[0] !== "0";
}

export default function ProfileScreen() {
  const { profile, recommendations, updateProfile } = usePatient();

  const [fullName, setFullName] = useState(profile.fullName);
  const [nationalId, setNationalId] = useState(profile.nationalId);
  const [ageText, setAgeText] = useState(String(profile.age));

  const parsedAge = Number.parseInt(ageText, 10);
  const ageValid = Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 130;
  const idValid = isValidNationalId(nationalId);

  const toggleCondition = (condition: ChronicCondition) => {
    const has = profile.chronicConditions.includes(condition);
    updateProfile({
      chronicConditions: has
        ? profile.chronicConditions.filter((c) => c !== condition)
        : [...profile.chronicConditions, condition],
    });
  };

  const commitProfile = () => {
    updateProfile({
      fullName: fullName.trim(),
      nationalId,
      age: ageValid ? parsedAge : profile.age,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-5 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-brand">
              <Ionicons name="person" size={40} color="#fff" />
            </View>
            <Text className="mt-2 text-xl font-bold text-ink">
              {profile.fullName}
            </Text>
            <Text className="text-xs text-muted">Hasta Profili</Text>
          </View>

          {/* Kişisel bilgiler */}
          <Card className="mb-5">
            <SectionHeader title="Kişisel Bilgiler" icon="id-card-outline" />

            <Field label="Ad Soyad">
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                onBlur={commitProfile}
                placeholder="Ad Soyad"
                className="rounded-xl border border-gray-200 bg-surface px-3 py-2 text-ink"
              />
            </Field>

            <Field
              label="T.C. Kimlik Numarası"
              error={!idValid ? "11 haneli geçerli bir numara girin." : undefined}
            >
              <TextInput
                value={nationalId}
                onChangeText={(t) => setNationalId(t.replace(/[^0-9]/g, ""))}
                onBlur={commitProfile}
                keyboardType="number-pad"
                maxLength={11}
                placeholder="XXXXXXXXXXX"
                className={`rounded-xl border bg-surface px-3 py-2 text-ink ${
                  idValid ? "border-gray-200" : "border-danger"
                }`}
              />
            </Field>

            <Field
              label="Yaş"
              error={!ageValid ? "Geçerli bir yaş girin." : undefined}
            >
              <TextInput
                value={ageText}
                onChangeText={(t) => setAgeText(t.replace(/[^0-9]/g, ""))}
                onBlur={commitProfile}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="Yaş"
                className={`rounded-xl border bg-surface px-3 py-2 text-ink ${
                  ageValid ? "border-gray-200" : "border-danger"
                }`}
              />
            </Field>

            <Field label="Cinsiyet">
              <View className="flex-row">
                {GENDERS.map((g) => {
                  const active = profile.gender === g.value;
                  return (
                    <Pressable
                      key={g.value}
                      onPress={() => updateProfile({ gender: g.value })}
                      className={`mr-2 rounded-full px-3 py-2 ${
                        active ? "bg-brand" : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          active ? "text-white" : "text-muted"
                        }`}
                      >
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          </Card>

          {/* Kronik hastalıklar */}
          <Card className="mb-5">
            <SectionHeader
              title="Kronik Hastalıklar"
              subtitle="Sizde bulunanları seçin"
              icon="fitness-outline"
            />
            <View className="flex-row flex-wrap">
              {CHRONIC_CONDITIONS.map((condition) => {
                const active = profile.chronicConditions.includes(condition);
                return (
                  <Pressable
                    key={condition}
                    onPress={() => toggleCondition(condition)}
                    className={`mb-2 mr-2 flex-row items-center rounded-full border px-3 py-2 ${
                      active
                        ? "border-brand bg-brand-light"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <Ionicons
                      name={active ? "checkmark-circle" : "add-circle-outline"}
                      size={15}
                      color={active ? "#0a7c86" : "#6b7280"}
                    />
                    <Text
                      className={`ml-1 text-xs font-medium ${
                        active ? "text-brand-dark" : "text-muted"
                      }`}
                    >
                      {condition}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Bu profile göre üretilen öneriler */}
          <Card>
            <SectionHeader
              title="Profilinize Özel Öneriler"
              subtitle="Bilgiler değiştikçe otomatik güncellenir"
              icon="sparkles-outline"
            />
            {recommendations.length === 0 ? (
              <Text className="text-sm text-muted">
                Şu an için ek tetkik önerisi bulunmuyor.
              </Text>
            ) : (
              recommendations.map((rec) => (
                <View
                  key={rec.id}
                  className="mb-2 flex-row items-center justify-between rounded-xl bg-surface px-3 py-2"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-semibold text-ink">
                      {rec.title}
                    </Text>
                    <Text className="text-[11px] text-muted">{rec.reason}</Text>
                  </View>
                  <PriorityBadge priority={rec.priority} />
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-medium text-muted">{label}</Text>
      {children}
      {error ? <Text className="mt-1 text-[11px] text-danger">{error}</Text> : null}
    </View>
  );
}
