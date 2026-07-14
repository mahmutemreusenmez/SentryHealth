import {
  Activity,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  HeartPulse,
  LogOut,
  PlusCircle,
  Save,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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

import { Card, EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { usePatient } from "../context/PatientContext";
import {
  CHRONIC_CONDITIONS,
  type ChronicCondition,
  type Gender,
  type VitalEntry,
} from "../data/types";
import { formatClock } from "../utils/format";
import {
  isValidTcKimlik,
  vitalsSchema,
  type VitalsFormValues,
} from "../utils/validation";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Kadın" },
  { value: "male", label: "Erkek" },
  { value: "unspecified", label: "Belirtilmedi" },
];

function isValidNationalId(id: string): boolean {
  return isValidTcKimlik(id);
}

export default function ProfileScreen() {
  const { profile, recommendations, vitals, updateProfile, saveVitals } =
    usePatient();
  const { logout } = useAuth();

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

  // Yaş alanını her değişimde state'e yansıt ki tetkikler anlık güncellensin.
  const onAgeChange = (t: string) => {
    const digits = t.replace(/[^0-9]/g, "");
    setAgeText(digits);
    const n = Number.parseInt(digits, 10);
    if (Number.isFinite(n) && n > 0 && n < 130) {
      updateProfile({ age: n });
    }
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
              <User size={40} color="#ffffff" />
            </View>
            <Text className="mt-2 text-xl font-bold text-ink">
              {profile.fullName}
            </Text>
            <Text className="text-xs text-muted">Hasta Profili</Text>
          </View>

          {/* Kişisel bilgiler */}
          <Card className="mb-5">
            <SectionHeader title="Kişisel Bilgiler" icon={CreditCard} />

            <Field label="Ad Soyad">
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                onBlur={commitProfile}
                placeholder="Ad Soyad"
                className="rounded-xl border border-line bg-surface px-3 py-2 text-ink"
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
                  idValid ? "border-line" : "border-danger"
                }`}
              />
            </Field>

            <Field
              label="Yaş"
              error={!ageValid ? "Geçerli bir yaş girin." : undefined}
            >
              <TextInput
                value={ageText}
                onChangeText={onAgeChange}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="Yaş"
                className={`rounded-xl border bg-surface px-3 py-2 text-ink ${
                  ageValid ? "border-line" : "border-danger"
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
              icon={Activity}
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
                        : "border-line bg-white"
                    }`}
                  >
                    {active ? (
                      <CheckCircle2 size={15} color="#059669" />
                    ) : (
                      <PlusCircle size={15} color="#6b7280" />
                    )}
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

          {/* Dinamik tetkikler */}
          <Card>
            <SectionHeader
              title="Zorunlu Tetkikler"
              subtitle="Yaş ve kronik duruma göre anlık güncellenir"
              icon={ClipboardList}
            />
            {recommendations.length === 0 ? (
              <EmptyState text="Şu an için zorunlu tetkik önerisi bulunmuyor." />
            ) : (
              recommendations.map((rec) => (
                <View
                  key={rec.id}
                  className="mb-2 rounded-xl border border-line bg-surface px-3 py-2.5"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 pr-2 text-sm font-semibold text-ink">
                      {rec.title}
                    </Text>
                    <StatusBadge recommendation={rec} />
                  </View>
                  <Text className="mt-1 text-[11px] text-muted">
                    {rec.cadence} · {rec.reason}
                  </Text>
                </View>
              ))
            )}
          </Card>

          {/* Günlük vital girişi — güvenli (şifreli) kayıt + akıllı sınırlar */}
          <View className="mt-5">
            <VitalsForm
              lastVitals={vitals}
              onSave={(values) =>
                saveVitals({ ...values, recordedAt: Date.now() })
              }
            />
          </View>

          {/* e-Devlet oturumunu kapat */}
          <Pressable
            onPress={logout}
            className="mt-5 flex-row items-center justify-center rounded-xl border border-danger bg-white py-3"
          >
            <LogOut size={16} color="#dc2626" />
            <Text className="ml-2 text-sm font-semibold text-danger">
              Güvenli Çıkış Yap
            </Text>
          </Pressable>
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

type VitalsFieldValues = {
  systolic: string;
  diastolic: string;
  pulse: string;
  glucose: string;
};

const VITAL_FIELDS: {
  name: keyof VitalsFieldValues;
  label: string;
  placeholder: string;
}[] = [
  { name: "systolic", label: "Büyük Tansiyon (mmHg)", placeholder: "120" },
  { name: "diastolic", label: "Küçük Tansiyon (mmHg)", placeholder: "80" },
  { name: "pulse", label: "Nabız (atım/dk)", placeholder: "72" },
  { name: "glucose", label: "Kan Şekeri (mg/dL)", placeholder: "110" },
];

function VitalsForm({
  lastVitals,
  onSave,
}: {
  lastVitals: VitalEntry | null;
  onSave: (values: Omit<VitalEntry, "recordedAt">) => void;
}) {
  const [saved, setSaved] = useState(false);
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<VitalsFieldValues>({
    defaultValues: { systolic: "", diastolic: "", pulse: "", glucose: "" },
  });

  const submit = handleSubmit((raw) => {
    const parsed = vitalsSchema.safeParse(raw);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (typeof path === "string") {
          setError(path as keyof VitalsFieldValues, { message: issue.message });
        }
      });
      setSaved(false);
      return;
    }
    const values: VitalsFormValues = parsed.data;
    onSave(values);
    reset({ systolic: "", diastolic: "", pulse: "", glucose: "" });
    setSaved(true);
  });

  return (
    <Card>
      <SectionHeader
        title="Günlük Vital Girişi"
        subtitle="Güvenli (AES) şifreli kayıt · mantıksız değerler engellenir"
        icon={HeartPulse}
      />
      {lastVitals ? (
        <View className="mb-3 rounded-xl bg-brand-light px-3 py-2">
          <Text className="text-[11px] font-semibold text-brand-dark">
            Son kayıt · {formatClock(lastVitals.recordedAt)}
          </Text>
          <Text className="text-[11px] text-ink">
            Tansiyon {lastVitals.systolic}/{lastVitals.diastolic} mmHg · Nabız{" "}
            {lastVitals.pulse}/dk · Şeker {lastVitals.glucose} mg/dL
          </Text>
        </View>
      ) : null}

      <View className="flex-row flex-wrap justify-between">
        {VITAL_FIELDS.map((f) => (
          <View key={f.name} style={{ width: "48%" }}>
            <Field label={f.label} error={errors[f.name]?.message}>
              <Controller
                control={control}
                name={f.name}
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value}
                    onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ""))}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9ca3af"
                    className={`rounded-xl border bg-surface px-3 py-2 text-ink ${
                      errors[f.name] ? "border-danger" : "border-line"
                    }`}
                  />
                )}
              />
            </Field>
          </View>
        ))}
      </View>

      {saved ? (
        <Text className="mb-2 text-[11px] font-semibold text-success">
          Vital ölçümünüz güvenli hafızaya şifreli olarak kaydedildi.
        </Text>
      ) : null}

      <Pressable
        onPress={submit}
        className="flex-row items-center justify-center rounded-xl bg-brand py-3"
      >
        <Save size={16} color="#ffffff" />
        <Text className="ml-2 text-sm font-bold text-white">
          Güvenli Kaydet
        </Text>
      </Pressable>
    </Card>
  );
}
