import { useNavigation } from "@react-navigation/native";
import {
  Activity,
  ArrowLeft,
  Home,
  Hospital,
  Siren,
  Stethoscope,
  TrendingUp,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Barcode from "../components/Barcode";
import LiveVideoPanel from "../components/LiveVideoPanel";
import { computeComplianceScore } from "../components/WeeklyCompliance";
import { usePatient } from "../context/PatientContext";
import { WEEKLY_COMPLIANCE } from "../data/mockData";
import type { ReferralLevel, TriageReferral } from "../data/types";
import { buildReferral, triageChannel } from "../services/triageChannel";

const REFERRAL_BUTTONS: {
  level: ReferralLevel;
  label: string;
  icon: typeof Siren;
  bg: string;
}[] = [
  { level: "emergency", label: "Acil Sevk", icon: Siren, bg: "#dc2626" },
  { level: "clinic", label: "Poliklinik Sevk", icon: Hospital, bg: "#d97706" },
  { level: "home", label: "Evde Takip", icon: Home, bg: "#16a34a" },
];

/**
 * SentryMD — Triyaj Hekimi Paneli (/doctor-panel).
 * Sol: hastanın e-Devlet kaynaklı kronik hastalıkları, yaşı ve ilaç uyum skoru.
 * Orta/üst: canlı WebRTC görüntülü pencere. Sağ: 3 yönlü sevk butonları.
 * Sevk verildiğinde `triageChannel` ile hastanın Triyaj ekranında barkod
 * canlı olarak belirir.
 */
export default function DoctorPanelScreen() {
  const { profile } = usePatient();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const canExit = navigation.canGoBack();
  const [issued, setIssued] = useState<TriageReferral | null>(null);

  const adherence = computeComplianceScore(WEEKLY_COMPLIANCE);
  const roomId = "sentry-triage-doctor";

  const decide = (level: ReferralLevel) => {
    const referral = buildReferral(level);
    triageChannel.publish(referral);
    setIssued(referral);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-4 flex-row items-center">
          {canExit ? (
            <Pressable
              onPress={() => navigation.goBack()}
              className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-white border border-line"
            >
              <ArrowLeft size={18} color="#1f2937" />
            </Pressable>
          ) : null}
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-light">
            <Stethoscope size={20} color="#0369a1" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">
              SentryMD · Triyaj Hekimi Paneli
            </Text>
            <Text className="text-xs text-muted">
              Canlı görüntülü değerlendirme ve sevk yönetimi
            </Text>
          </View>
        </View>

        {/* Canlı video penceresi */}
        <View
          className="mb-4 overflow-hidden rounded-3xl bg-ink"
          style={{ height: 220 }}
        >
          <LiveVideoPanel active muted={false} roomId={roomId} />
          <View className="absolute left-3 top-3 flex-row items-center rounded-full bg-danger px-3 py-1">
            <View className="mr-2 h-2 w-2 rounded-full bg-white" />
            <Text className="text-[11px] font-semibold text-white">CANLI</Text>
          </View>
        </View>

        <View className={wide ? "flex-row" : ""}>
          {/* Sol: hasta özeti */}
          <View className={wide ? "mr-3 flex-1" : "mb-4"}>
            <View className="rounded-2xl border border-line bg-white p-4">
              <View className="mb-3 flex-row items-center">
                <User size={16} color="#0369a1" />
                <Text className="ml-2 text-sm font-bold text-ink">
                  Hasta Özeti (e-Devlet)
                </Text>
              </View>

              <Row label="Ad Soyad" value={profile.fullName} />
              <Row label="Yaş" value={`${profile.age}`} />
              <Row
                label="Cinsiyet"
                value={
                  profile.gender === "female"
                    ? "Kadın"
                    : profile.gender === "male"
                      ? "Erkek"
                      : "Belirtilmedi"
                }
              />

              <View className="mt-2">
                <Text className="mb-1 text-[11px] font-semibold text-muted">
                  Kronik Hastalıklar
                </Text>
                <View className="flex-row flex-wrap">
                  {profile.chronicConditions.length === 0 ? (
                    <Text className="text-xs text-muted">Kayıt yok</Text>
                  ) : (
                    profile.chronicConditions.map((c) => (
                      <View
                        key={c}
                        className="mb-1 mr-1 rounded-full bg-blue-light px-2 py-0.5"
                      >
                        <Text className="text-[10px] font-semibold text-blue-dark">
                          {c}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View className="mt-3 flex-row items-center rounded-xl bg-brand-light px-3 py-2">
                <TrendingUp size={15} color="#BE123C" />
                <Text className="ml-2 flex-1 text-[11px] font-semibold text-brand-dark">
                  İlaç Uyum Skoru
                </Text>
                <Text className="text-base font-extrabold text-brand-dark">
                  %{adherence}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center">
                <Activity size={12} color="#6b7280" />
                <Text className="ml-1 text-[10px] text-muted">
                  Canlı vital izleme aktif · SpO₂ / Nabız
                </Text>
              </View>
            </View>
          </View>

          {/* Sağ: 3 yönlü sevk butonları */}
          <View className={wide ? "flex-1" : ""}>
            <View className="rounded-2xl border border-line bg-white p-4">
              <Text className="mb-3 text-sm font-bold text-ink">
                Sevk Kararı (3 Yönlü)
              </Text>
              {REFERRAL_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                const active = issued?.level === btn.level;
                return (
                  <Pressable
                    key={btn.level}
                    onPress={() => decide(btn.level)}
                    className="mb-2 flex-row items-center rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: btn.bg,
                      opacity: active ? 1 : 0.92,
                    }}
                  >
                    <Icon size={18} color="#ffffff" />
                    <Text className="ml-2 flex-1 text-sm font-bold text-white">
                      {btn.label}
                    </Text>
                    {active ? (
                      <Text className="text-[11px] font-semibold text-white">
                        Gönderildi
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}

              {issued ? (
                <View className="mt-2 items-center rounded-2xl border border-line bg-surface p-3">
                  <Text className="mb-1 text-[11px] font-semibold text-ink">
                    {issued.title}
                  </Text>
                  <Text className="mb-2 text-[10px] text-muted">
                    Hastanın ekranına canlı iletildi
                  </Text>
                  <Barcode value={issued.code} width={220} />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Text className="mt-3 text-center text-[10px] text-muted">
          Hekim paneli aynı tarayıcıdaki hasta uygulamasıyla canlı kanal
          üzerinden haberleşir. Klinik veriler jüri sunumu için simüledir.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-1 flex-row justify-between">
      <Text className="text-[11px] text-muted">{label}</Text>
      <Text className="text-[11px] font-semibold text-ink">{value}</Text>
    </View>
  );
}
