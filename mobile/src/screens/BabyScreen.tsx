import {
  Baby,
  CalendarClock,
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

import ConfirmCallModal from "../components/ConfirmCallModal";
import GrowthChart from "../components/GrowthChart";
import LiveVideoPanel, { type IncomingReferral } from "../components/LiveVideoPanel";
import LiveChatPanel from "../components/LiveChatPanel";
import PermissionModal from "../components/PermissionModal";
import { PrivacyShieldModal } from "../components/PrivacyShield";
import VaccineCalendar from "../components/VaccineCalendar";
import { Card, EmptyState, PressableScale, SectionHeader } from "../components/ui";
import { useBaby } from "../context/BabyContext";
import { useLocale } from "../i18n/LocaleContext";
import { GROWTH_REFERENCE, classifyPercentile } from "../data/growthReference";
import type {
  GrowthMetric,
  NurseReferral,
  NurseReferralLevel,
} from "../data/types";
import { babyChannel } from "../services/babyChannel";
import { BABY_LOBBY_ROOM, makeCallRoomId } from "../services/rtcConfig";
import { speak } from "../services/speechService";

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
  const { t } = useLocale();

  const [metric, setMetric] = useState<GrowthMetric>("weightKg");
  const [active, setActive] = useState(false);
  const [confirmGate, setConfirmGate] = useState(false);
  const [privacyGate, setPrivacyGate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referral, setReferral] = useState<NurseReferral | null>(null);
  const [permissionModal, setPermissionModal] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);

  // İzin reddedilince çökertme; şık e-Nabız izin modalını göster.
  const onPanelError = useCallback((message: string) => {
    setError(message);
    if (message.includes("izn") || message.includes("desteklemiyor")) {
      setPermissionModal(true);
    }
  }, []);

  const retryPermission = useCallback(() => {
    setPermissionModal(false);
    setError(null);
    setAttemptKey((k) => k + 1);
  }, []);

  // Ebe/hemşire panelinden gelen canlı yönlendirmeyi dinle (barkod belirir).
  useEffect(() => {
    const unsubscribe = babyChannel.subscribe((next) => setReferral(next));
    return unsubscribe;
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const roomId = useMemo(() => makeCallRoomId(), [attemptKey]);

  // Ebe/hemşire paneline duyurulacak bebek/anne kimliği.
  const patient = useMemo(
    () => ({ nationalId: "", name: baby.fullName }),
    [baby.fullName],
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
        : "#E11D48";

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
              <Baby size={22} color="#BE123C" />
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
              <Text className="text-xs font-bold text-brand-dark">Yeni Doğan</Text>
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
              className="mb-3 justify-end overflow-hidden rounded-3xl bg-ink p-4"
              style={{ height: active ? 380 : 150 }}
            >
              <LiveVideoPanel
                key={attemptKey}
                active={active}
                muted={false}
                roomId={roomId}
                lobbyRoom={BABY_LOBBY_ROOM}
                role="mother"
                patient={patient}
                metadata={metadata}
                onError={onPanelError}
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
                <View className="rounded-2xl border-l-4 border-brand bg-black/60 px-5 py-4">
                  <Text className="text-[11px] font-semibold text-brand">
                    Görüşme Bilgisi · Oda: {roomId}
                  </Text>
                  <Text className="mt-1.5 text-xs leading-6 text-white">
                    Ateş {vitals.temperature.toFixed(1)}°C · Kilo{" "}
                    {vitals.weightKg} kg · Emzirme {vitals.feedingsPerDay}/gün
                  </Text>
                </View>
              )}
            </View>

            {active ? (
              <PressableScale
                onPress={() => setActive(false)}
                accessibilityRole="button"
                accessibilityLabel="Görüşmeyi bitir"
                className="flex-row items-center justify-center rounded-2xl bg-danger py-4"
              >
                <PhoneOff size={18} color="#ffffff" />
                <Text className="ml-2 text-base font-bold text-white">
                  {t("triage.endCall")}
                </Text>
              </PressableScale>
            ) : (
              <PressableScale
                onPress={() => {
                  setError(null);
                  setConfirmGate(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t("nurse.connect")}
                className="flex-row items-center justify-center rounded-2xl bg-brand py-4"
              >
                <Video size={18} color="#ffffff" />
                <Text className="ml-2 text-base font-bold text-white">
                  {t("nurse.connect")}
                </Text>
              </PressableScale>
            )}

            <Text className="mt-2 text-center text-[10px] text-muted">
              Bebek vital verileri (ateş, kilo, emzirme sıklığı) görüşmede
              sağlık personelinin ekranına canlı olarak aktarılır. Bağlantı,
              sağlık personeli paneline canlı kurulur.
            </Text>

            {/* Anne – sağlık personeli canlı sohbeti (görüşme aktifken) */}
            {active ? (
              <View className="mt-3">
                <LiveChatPanel
                  roomId={roomId}
                  from="patient"
                  title="Sağlık Personeli ile Sohbet"
                />
              </View>
            ) : null}
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

          {/* Gelişim grafiği */}
          <Card className="mb-5">
            <SectionHeader
              title="Gelişim Grafiği"
              subtitle="Standart gelişim eğrisi üzerinde bebeğinizin yeri"
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
                  percentile.tone === "normal" ? "bg-success-light" : "bg-danger/10"
                }`}
              >
                <Ruler
                  size={15}
                  color={percentile.tone === "normal" ? "#15803d" : "#dc2626"}
                />
                <Text
                  className={`ml-2 flex-1 text-[11px] font-semibold ${
                    percentile.tone === "normal"
                      ? "text-success-dark"
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
              <Thermometer size={14} color="#BE123C" />
              <Text className="ml-2 text-xs font-semibold text-brand-dark">
                Yaklaşan Aşıları Sesli Oku
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmCallModal
        visible={confirmGate}
        title={t("confirm.nurse.title")}
        message={t("confirm.nurse.message")}
        acceptLabel={t("confirm.nurse.accept")}
        onAccept={() => {
          setConfirmGate(false);
          setPrivacyGate(true);
        }}
        onCancel={() => setConfirmGate(false)}
      />

      <PrivacyShieldModal
        visible={privacyGate}
        onAccept={() => {
          setPrivacyGate(false);
          setActive(true);
        }}
        onDecline={() => setPrivacyGate(false)}
      />

      <PermissionModal
        visible={permissionModal}
        onRetry={retryPermission}
        onClose={() => setPermissionModal(false)}
      />
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
        <Plus size={15} color="#BE123C" />
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
