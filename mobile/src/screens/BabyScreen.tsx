import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Baby,
  CalendarClock,
  Droplets,
  PhoneOff,
  Plus,
  Ruler,
  Stethoscope,
  Syringe,
  Thermometer,
  TicketCheck,
  TrendingUp,
  Video,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import GrowthChart from "../components/GrowthChart";
import LiveVideoPanel, { type IncomingReferral } from "../components/LiveVideoPanel";
import VaccineCalendar from "../components/VaccineCalendar";
import { Card, EmptyState, SectionHeader } from "../components/ui";
import { useBaby } from "../context/BabyContext";
import { GROWTH_REFERENCE, classifyPercentile } from "../data/growthReference";
import type {
  GrowthMetric,
  NurseReferral,
  NurseReferralLevel,
  RootStackParamList,
  RootTabParamList,
} from "../data/types";
import { babyChannel } from "../services/babyChannel";
import { speak } from "../services/speechService";

type BabyNav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, "Baby">,
  NativeStackNavigationProp<RootStackParamList>
>;

const METRICS: { key: GrowthMetric; label: string; unit: string }[] = [
  { key: "weightKg", label: "Kilo", unit: "kg" },
  { key: "heightCm", label: "Boy", unit: "cm" },
  { key: "headCm", label: "Baş Çevresi", unit: "cm" },
];

export default function BabyScreen() {
  const {
    baby,
    ageMonths,
    growth,
    vaccines,
    dueVaccines,
    vitals,
    toggleVaccine,
    addGrowthMeasurement,
  } = useBaby();
  const navigation = useNavigation<BabyNav>();

  const [metric, setMetric] = useState<GrowthMetric>("weightKg");
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referral, setReferral] = useState<NurseReferral | null>(null);

  // Ebe/hemşire panelinden gelen canlı yönlendirmeyi dinle (barkod belirir).
  useEffect(() => {
    const unsubscribe = babyChannel.subscribe((next) => setReferral(next));
    return unsubscribe;
  }, []);

  const roomId = useMemo(
    () => `sentry-baby-nurse-${Math.floor(1000 + Math.random() * 9000)}`,
    [],
  );

  // Bebeğin canlı vital metadata'sı (ebe/hemşire ekranına aktarılır).
  const metadata = useMemo(
    () =>
      `Ateş ${vitals.temperature.toFixed(1)}°C · Kilo ${vitals.weightKg} kg · ` +
      `Emzirme ${vitals.feedingsPerDay}/gün · Bebek ${baby.fullName} (${ageMonths} ay)`,
    [vitals.temperature, vitals.weightKg, vitals.feedingsPerDay, baby.fullName, ageMonths],
  );

  // Ebe/hemşire panelinden (web sitesi) sinyal üzerinden gelen canlı yönlendirme.
  const onIncomingReferral = useCallback((incoming: IncomingReferral) => {
    const level: NurseReferralLevel =
      incoming.level === "pediatric" || incoming.level === "family-health"
        ? incoming.level
        : "home";
    setReferral({
      id: `sig-${Date.now()}`,
      level,
      code: incoming.code,
      title: incoming.title,
      message: incoming.message,
      issuedAt: Date.now(),
    });
  }, []);

  const selectedMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const reference = GROWTH_REFERENCE[baby.gender][metric];
  const points = useMemo(
    () => growth.map((m) => ({ ageMonths: m.ageMonths, value: m[metric] })),
    [growth, metric],
  );

  const latest = growth.length ? growth[growth.length - 1] : null;
  const percentile = latest
    ? classifyPercentile(baby.gender, metric, latest.ageMonths, latest[metric])
    : null;

  const referralAccent =
    referral?.level === "pediatric"
      ? "#dc2626"
      : referral?.level === "family-health"
        ? "#d97706"
        : "#10b981";

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
          {/* Başlık */}
          <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-brand-light">
              <Baby size={22} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-ink">
                {baby.fullName}
              </Text>
              <Text className="text-xs text-muted">
                Yeni Doğan Takip · {ageMonths} aylık ·{" "}
                {baby.gender === "female" ? "Kız" : "Erkek"}
              </Text>
            </View>
            <View className="rounded-xl border border-brand-light bg-white px-3 py-2">
              <Text className="text-xs font-bold text-brand-dark">SentryBaby</Text>
              <Text className="text-[9px] text-muted">Aile Hekimliği</Text>
            </View>
          </View>

          {/* Yaklaşan aşı uyarısı */}
          {dueVaccines.length > 0 ? (
            <View className="mb-4 flex-row items-center rounded-2xl border border-blue bg-blue-light/40 p-3">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-light">
                <Syringe size={20} color="#0369a1" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-blue-dark">
                  Yaklaşan / Bekleyen Aşı
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink">
                  {dueVaccines
                    .map((v) => `${v.name} (${v.dose})`)
                    .join(" • ")}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Canlı Ebe / Hemşire triyaj odası */}
          <Card className="mb-5">
            <SectionHeader
              title="Ebe / Hemşire Triyajı"
              subtitle="Panik anında tek dokunuşla canlı bağlantı"
              icon={Stethoscope}
            />

            <View
              className="mb-3 justify-end overflow-hidden rounded-3xl bg-ink p-3"
              style={{ height: active ? 240 : 130 }}
            >
              <LiveVideoPanel
                active={active}
                muted={false}
                roomId={roomId}
                role="mother"
                metadata={metadata}
                onError={setError}
                onReferral={onIncomingReferral}
              />
              {!active ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="px-6 text-center text-xs text-white/70">
                    {error ??
                      "Bebeğinizle ilgili acil durumda (ateş, gaz sancısı, beslenme) nöbetçi ebe/hemşireye bağlanın."}
                  </Text>
                </View>
              ) : (
                <View className="rounded-2xl bg-black/50 px-3 py-2">
                  <Text className="text-[11px] font-semibold text-brand">
                    Canlı Metadata · Oda: {roomId}
                  </Text>
                  <Text className="mt-1 text-[11px] text-white">
                    Ateş {vitals.temperature.toFixed(1)}°C · Kilo{" "}
                    {vitals.weightKg} kg · Emzirme {vitals.feedingsPerDay}/gün
                  </Text>
                </View>
              )}
            </View>

            {active ? (
              <Pressable
                onPress={() => setActive(false)}
                className="flex-row items-center justify-center rounded-2xl bg-danger py-3"
              >
                <PhoneOff size={18} color="#ffffff" />
                <Text className="ml-2 text-sm font-bold text-white">
                  Görüşmeyi Bitir
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setError(null);
                  setActive(true);
                }}
                className="flex-row items-center justify-center rounded-2xl bg-brand py-3"
              >
                <Video size={18} color="#ffffff" />
                <Text className="ml-2 text-sm font-bold text-white">
                  Ebe / Hemşireye Bağlan
                </Text>
              </Pressable>
            )}

            <Text className="mt-2 text-center text-[10px] text-muted">
              Bebek vital verileri (ateş, kilo, emzirme sıklığı) görüşmede
              ebe/hemşirenin ekranına canlı metadata olarak aktarılır. Bağlantı,
              SentryHealth web sitesinin WebRTC sinyal sunucusu (/rtc) üzerinden
              kurulur; jüri sunumu için simülasyondur.
            </Text>
          </Card>

          {/* Ebe/hemşireden gelen canlı yönlendirme barkodu */}
          {referral ? (
            <View
              className="mb-5 items-center rounded-2xl border bg-white p-4"
              style={{ borderColor: referralAccent }}
            >
              <View className="mb-1 flex-row items-center">
                <TicketCheck size={16} color={referralAccent} />
                <Text
                  className="ml-2 text-sm font-bold"
                  style={{ color: referralAccent }}
                >
                  {referral.title}
                </Text>
              </View>
              <Text className="mb-2 px-2 text-center text-[11px] leading-5 text-ink">
                {referral.message}
              </Text>
              <View className="rounded-xl bg-surface px-4 py-2">
                <Text className="text-base font-extrabold tracking-widest text-ink">
                  {referral.code}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Persentil (gelişim) grafiği */}
          <Card className="mb-5">
            <SectionHeader
              title="Gelişim (Persentil) Grafiği"
              subtitle="WHO standart eğrisi üzerinde bebeğinizin yeri"
              icon={TrendingUp}
            />
            <View className="mb-3 flex-row">
              {METRICS.map((m) => {
                const activeMetric = m.key === metric;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMetric(m.key)}
                    className={`mr-2 rounded-full px-3 py-2 ${
                      activeMetric ? "bg-brand" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        activeMetric ? "text-white" : "text-muted"
                      }`}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {points.length === 0 ? (
              <EmptyState text="Henüz ölçüm girilmedi." />
            ) : (
              <GrowthChart
                reference={reference}
                points={points}
                unit={selectedMetric.unit}
              />
            )}

            {latest && percentile ? (
              <View
                className={`mt-3 flex-row items-center rounded-xl px-3 py-2 ${
                  percentile.tone === "normal" ? "bg-brand-light" : "bg-danger/10"
                }`}
              >
                <Ruler
                  size={15}
                  color={percentile.tone === "normal" ? "#059669" : "#dc2626"}
                />
                <Text
                  className={`ml-2 flex-1 text-[11px] font-semibold ${
                    percentile.tone === "normal"
                      ? "text-brand-dark"
                      : "text-danger"
                  }`}
                >
                  {selectedMetric.label}: {latest[metric]} {selectedMetric.unit} ·{" "}
                  {percentile.label}
                </Text>
              </View>
            ) : null}

            <AddGrowthForm onAdd={addGrowthMeasurement} defaultAge={ageMonths} />
          </Card>

          {/* Aşı takvimi */}
          <Card className="mb-5">
            <SectionHeader
              title="Aşı Takvimi"
              subtitle="Sağlık Bakanlığı GBP · dokununca 'Yapıldı' işaretlenir"
              icon={CalendarClock}
            />
            <VaccineCalendar vaccines={vaccines} onToggle={toggleVaccine} />
            <Pressable
              onPress={() =>
                speak(
                  dueVaccines.length > 0
                    ? `${baby.fullName} için yaklaşan aşı: ${dueVaccines
                        .map((v) => v.name)
                        .join(", ")}.`
                    : `${baby.fullName} için yaklaşan bekleyen aşı bulunmuyor.`,
                )
              }
              className="mt-1 flex-row items-center justify-center rounded-xl bg-brand-light py-2"
            >
              <Thermometer size={14} color="#059669" />
              <Text className="ml-2 text-xs font-semibold text-brand-dark">
                Yaklaşan Aşıları Sesli Oku
              </Text>
            </Pressable>
          </Card>

          {/* Ebe/Hemşire paneli (rol arayüzü) */}
          <Pressable
            onPress={() => navigation.navigate("NursePanel")}
            className="flex-row items-center justify-center rounded-xl border border-blue bg-white py-3"
          >
            <Droplets size={16} color="#0284c7" />
            <Text className="ml-2 text-sm font-bold text-blue-dark">
              Ebe / Hemşire Panelini Aç
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AddGrowthForm({
  onAdd,
  defaultAge,
}: {
  onAdd: (entry: {
    ageMonths: number;
    heightCm: number;
    weightKg: number;
    headCm: number;
  }) => void;
  defaultAge: number;
}) {
  const [open, setOpen] = useState(false);
  const [age, setAge] = useState(String(defaultAge));
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [head, setHead] = useState("");

  const parse = (t: string) => Number.parseFloat(t.replace(",", "."));
  const ageN = Number.parseInt(age, 10);
  const heightN = parse(height);
  const weightN = parse(weight);
  const headN = parse(head);
  const valid =
    Number.isFinite(ageN) &&
    ageN >= 0 &&
    ageN <= 24 &&
    Number.isFinite(heightN) &&
    heightN > 20 &&
    heightN < 120 &&
    Number.isFinite(weightN) &&
    weightN > 1 &&
    weightN < 30 &&
    Number.isFinite(headN) &&
    headN > 25 &&
    headN < 60;

  const submit = () => {
    if (!valid) return;
    onAdd({
      ageMonths: ageN,
      heightCm: heightN,
      weightKg: weightN,
      headCm: headN,
    });
    setHeight("");
    setWeight("");
    setHead("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        className="mt-3 flex-row items-center justify-center rounded-xl border border-brand bg-white py-2.5"
      >
        <Plus size={15} color="#059669" />
        <Text className="ml-2 text-xs font-bold text-brand-dark">
          Yeni Ölçüm Ekle
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="mt-3 rounded-2xl border border-line bg-surface p-3">
      <View className="flex-row flex-wrap justify-between">
        <GrowthInput label="Yaş (ay)" value={age} onChange={setAge} placeholder="3" />
        <GrowthInput
          label="Boy (cm)"
          value={height}
          onChange={setHeight}
          placeholder="60"
        />
        <GrowthInput
          label="Kilo (kg)"
          value={weight}
          onChange={setWeight}
          placeholder="5.8"
        />
        <GrowthInput
          label="Baş Çevresi (cm)"
          value={head}
          onChange={setHead}
          placeholder="39.5"
        />
      </View>
      {!valid ? (
        <Text className="mb-2 text-[11px] text-danger">
          Tüm alanlara mantıklı değerler girin (yaş 0-24 ay).
        </Text>
      ) : null}
      <View className="flex-row">
        <Pressable
          onPress={submit}
          disabled={!valid}
          className={`mr-2 flex-1 items-center rounded-xl py-2.5 ${
            valid ? "bg-brand" : "bg-gray-300"
          }`}
        >
          <Text className="text-xs font-bold text-white">Kaydet</Text>
        </Pressable>
        <Pressable
          onPress={() => setOpen(false)}
          className="items-center rounded-xl border border-line bg-white px-4 py-2.5"
        >
          <Text className="text-xs font-semibold text-muted">Vazgeç</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GrowthInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
}) {
  return (
    <View className="mb-2" style={{ width: "48%" }}>
      <Text className="mb-1 text-[11px] font-medium text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ""))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        className="rounded-xl border border-line bg-white px-3 py-2 text-ink"
      />
    </View>
  );
}
