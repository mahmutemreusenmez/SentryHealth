import {
  Accessibility,
  Activity,
  Baby,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Contrast,
  CreditCard,
  HeartPulse,
  Lock,
  LogOut,
  PlusCircle,
  Save,
  Stethoscope,
  Type,
  User,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
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
import { useAccessibility } from "../context/AccessibilityContext";
import { useAuth } from "../context/AuthContext";
import { useBaby } from "../context/BabyContext";
import { usePatient } from "../context/PatientContext";
import {
  CHRONIC_CONDITIONS,
  type ChronicCondition,
  type Gender,
  type VitalEntry,
} from "../data/types";
import { formatClock, formatDateShort } from "../utils/format";
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
  const { auth, login, logout } = useAuth();
  const {
    largeText,
    highContrast,
    toggleLargeText,
    toggleHighContrast,
  } = useAccessibility();
  const { hasNewborn, baby, ageMonths, setHasNewborn } = useBaby();

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
          {/* e-Nabız kurumsal kimlik kartı */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
            <View className="flex-row items-center bg-brand px-5 py-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <User size={28} color="#ffffff" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-lg font-bold text-white">
                  {profile.fullName}
                </Text>
                <Text className="text-[11px] text-white/85">
                  e-Nabız Kişisel Sağlık Kaydı
                </Text>
              </View>
              <View className="rounded-lg bg-white/20 px-2.5 py-1">
                <Text className="text-[10px] font-bold text-white">
                  {profile.bloodType}
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap px-5 py-4">
              <IdentityItem label="T.C. Kimlik No" value={profile.nationalId} />
              <IdentityItem label="Kan Grubu" value={profile.bloodType} />
              <IdentityItem
                label="Yaş / Cinsiyet"
                value={`${profile.age} · ${
                  GENDERS.find((g) => g.value === profile.gender)?.label ??
                  "Belirtilmedi"
                }`}
              />
              <IdentityItem
                label="Aile Hekimi"
                value={profile.familyPhysician}
                wide
              />
            </View>
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
                      <CheckCircle2 size={15} color="#BE123C" />
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

          {/* Yeni Doğan Bebek — tanımlıysa "Yeni Doğan" sekmesi aktifleşir */}
          <Card className="mt-5">
            <SectionHeader
              title="Yeni Doğan Bebek"
              subtitle="Tanımlıysa 'Yeni Doğan' takip sekmesi açılır"
              icon={Baby}
            />
            {hasNewborn ? (
              <View className="mb-3 flex-row items-center rounded-xl bg-brand-light px-3 py-2.5">
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Baby size={18} color="#BE123C" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink">
                    {baby.fullName}
                  </Text>
                  <Text className="text-[11px] text-muted">
                    {ageMonths} aylık · Doğum: {formatDateShort(baby.birthDate)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="mb-3 text-xs text-muted">
                Profilde tanımlı yeni doğan bebek yok. Eklerseniz aşı takvimi,
                gelişim grafiği ve ebe/hemşire triyajı aktifleşir.
              </Text>
            )}
            <Pressable
              onPress={() => setHasNewborn(!hasNewborn)}
              className={`flex-row items-center justify-center rounded-xl py-3 ${
                hasNewborn ? "border border-danger bg-white" : "bg-brand"
              }`}
            >
              <Baby size={16} color={hasNewborn ? "#dc2626" : "#ffffff"} />
              <Text
                className={`ml-2 text-sm font-bold ${
                  hasNewborn ? "text-danger" : "text-white"
                }`}
              >
                {hasNewborn
                  ? "Yeni Doğan Takibini Kaldır"
                  : "Yeni Doğan Bebek Ekle"}
              </Text>
            </Pressable>
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

          {/* Erişilebilirlik ve gizlilik */}
          <View className="mt-5">
            <Card>
              <SectionHeader
                title="Erişilebilirlik ve Gizlilik"
                subtitle="Yazı boyutu, kontrast ve güvenli kayıt"
                icon={Accessibility}
              />
              <ToggleRow
                icon={Type}
                label="Büyük Yazı"
                hint="Yazı boyutunu büyütür (yaşlı dostu)."
                value={largeText}
                onToggle={toggleLargeText}
              />
              <ToggleRow
                icon={Contrast}
                label="Yüksek Kontrast"
                hint="Koyu/net tema ile okunabilirliği artırır."
                value={highContrast}
                onToggle={toggleHighContrast}
              />
              <View className="mt-2 flex-row items-start rounded-xl bg-brand-light/60 p-3">
                <Text className="flex-1 text-[11px] leading-4 text-brand-dark">
                  Sağlık verileriniz cihazınızda güvenli (şifreli) olarak
                  saklanır; kimlik bilginiz ham olarak tutulmaz.
                </Text>
              </View>
            </Card>
          </View>

          {/* Sağlık personeli paneline geçiş */}
          <View className="mt-5">
            <StaffAccessCard onLogin={login} error={auth.error} />
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

function IdentityItem({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View className="mb-3" style={{ width: wide ? "100%" : "50%" }}>
      <Text className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </Text>
      <Text className="mt-0.5 text-sm font-bold text-ink">{value}</Text>
    </View>
  );
}

function StaffAccessCard({
  onLogin,
  error,
}: {
  onLogin: (nationalId: string, password: string) => void;
  error: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");

  const submit = () => onLogin(nationalId.trim(), password);

  return (
    <View className="rounded-2xl border border-line bg-white p-4">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel="Sağlık personeli girişi"
        className="flex-row items-center"
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-light">
          <Stethoscope size={20} color="#0369a1" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-ink">
            Sağlık Personeli Girişi
          </Text>
          <Text className="mt-0.5 text-[11px] text-muted">
            Hekim / Hemşire / Ebe paneline geçiş
          </Text>
        </View>
        <ChevronRight
          size={18}
          color="#6b7280"
          style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}
        />
      </Pressable>

      {open ? (
        <View className="mt-4">
          <View className="mb-2 flex-row items-center rounded-2xl border border-line bg-surface px-4">
            <User size={18} color="#6b7280" />
            <TextInput
              value={nationalId}
              onChangeText={(t) => setNationalId(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={11}
              placeholder="T.C. Kimlik No"
              placeholderTextColor="#9ca3af"
              className="ml-2 flex-1 py-3 text-ink"
            />
          </View>
          <View className="mb-2 flex-row items-center rounded-2xl border border-line bg-surface px-4">
            <Lock size={18} color="#6b7280" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Şifre"
              placeholderTextColor="#9ca3af"
              className="ml-2 flex-1 py-3 text-ink"
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          </View>
          {error ? (
            <Text className="mb-2 text-[11px] text-danger">{error}</Text>
          ) : null}
          <Pressable
            onPress={submit}
            className="flex-row items-center justify-center rounded-xl bg-blue py-3"
          >
            <Stethoscope size={16} color="#ffffff" />
            <Text className="ml-2 text-sm font-bold text-white">
              Panele Giriş Yap
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  hint,
  value,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      className="mb-2 flex-row items-center rounded-xl border border-line bg-surface px-3 py-3"
    >
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-brand-light">
        <Icon size={18} color="#BE123C" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-ink">{label}</Text>
        <Text className="text-[11px] text-muted">{hint}</Text>
      </View>
      <View
        className={`h-6 w-11 justify-center rounded-full px-0.5 ${
          value ? "bg-brand" : "bg-line"
        }`}
      >
        <View
          className={`h-5 w-5 rounded-full bg-white ${value ? "self-end" : "self-start"}`}
        />
      </View>
    </Pressable>
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
  respiratoryRate: string;
  temperature: string;
};

const VITAL_FIELDS: {
  name: keyof VitalsFieldValues;
  label: string;
  placeholder: string;
  /** Ondalık girişe izin verilen alanlar (ör. ateş). */
  decimal?: boolean;
}[] = [
  { name: "systolic", label: "Büyük Tansiyon (mmHg)", placeholder: "120" },
  { name: "diastolic", label: "Küçük Tansiyon (mmHg)", placeholder: "80" },
  { name: "pulse", label: "Nabız (atım/dk)", placeholder: "72" },
  { name: "glucose", label: "Kan Şekeri (mg/dL)", placeholder: "110" },
  { name: "respiratoryRate", label: "Solunum Hızı (/dk)", placeholder: "16" },
  { name: "temperature", label: "Ateş (°C)", placeholder: "36.7", decimal: true },
];

const EMPTY_VITALS: VitalsFieldValues = {
  systolic: "",
  diastolic: "",
  pulse: "",
  glucose: "",
  respiratoryRate: "",
  temperature: "",
};

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
    defaultValues: EMPTY_VITALS,
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
    reset(EMPTY_VITALS);
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
                    onChangeText={(t) =>
                      onChange(
                        f.decimal
                          ? t.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
                          : t.replace(/[^0-9]/g, ""),
                      )
                    }
                    onBlur={onBlur}
                    keyboardType={f.decimal ? "decimal-pad" : "number-pad"}
                    maxLength={f.decimal ? 5 : 3}
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
