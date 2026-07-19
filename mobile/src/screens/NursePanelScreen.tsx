import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Baby,
  Droplets,
  Home,
  Hospital,
  Milk,
  Siren,
  Thermometer,
  Weight,
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
import { useBaby } from "../context/BabyContext";
import type { NurseReferral, NurseReferralLevel } from "../data/types";
import { babyChannel, buildNurseReferral } from "../services/babyChannel";

const REFERRAL_BUTTONS: {
  level: NurseReferralLevel;
  label: string;
  icon: typeof Siren;
  bg: string;
}[] = [
  {
    level: "pediatric",
    label: "Uzman Çocuk Hekimine Sevk Et",
    icon: Hospital,
    bg: "#dc2626",
  },
  {
    level: "family-health",
    label: "Aile Sağlığı Merkezine Davet Et",
    icon: Baby,
    bg: "#d97706",
  },
  { level: "home", label: "Evde Takibe Devam Et", icon: Home, bg: "#16a34a" },
];

/**
 * SentryBaby — Ebe/Hemşire kontrol paneli (/nurse-panel).
 * Yeni doğan bebeklerin annelerinden gelen görüntülü çağrıları yanıtlar;
 * bebek vital metadatasını görür ve 3 yönlü yönlendirme yapar. Karar
 * `babyChannel` ile annenin ekranında canlı barkod olarak belirir.
 */
export default function NursePanelScreen() {
  const { baby, ageMonths, vitals } = useBaby();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const canExit = navigation.canGoBack();
  const [issued, setIssued] = useState<NurseReferral | null>(null);

  const roomId = "sentry-baby-nurse-station";

  const decide = (level: NurseReferralLevel) => {
    const referral = buildNurseReferral(level);
    babyChannel.publish(referral);
    setIssued(referral);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-4 flex-row items-center">
          {canExit ? (
            <Pressable
              onPress={() => navigation.goBack()}
              className="mr-2 h-9 w-9 items-center justify-center rounded-full border border-line bg-white"
            >
              <ArrowLeft size={18} color="#1f2937" />
            </Pressable>
          ) : null}
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-light">
            <Droplets size={20} color="#BE123C" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">
              SentryMD · Ebe / Hemşire Paneli
            </Text>
            <Text className="text-xs text-muted">
              Yeni doğan canlı triyajı ve yönlendirme
            </Text>
          </View>
        </View>

        {/* Canlı görüntülü çağrı penceresi */}
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
          {/* Sol: bebek özeti + canlı vital metadata */}
          <View className={wide ? "mr-3 flex-1" : "mb-4"}>
            <View className="rounded-2xl border border-line bg-white p-4">
              <View className="mb-3 flex-row items-center">
                <Baby size={16} color="#BE123C" />
                <Text className="ml-2 text-sm font-bold text-ink">
                  Bebek Özeti
                </Text>
              </View>
              <Row label="Ad Soyad" value={baby.fullName} />
              <Row label="Yaş" value={`${ageMonths} aylık`} />
              <Row
                label="Cinsiyet"
                value={baby.gender === "female" ? "Kız" : "Erkek"}
              />

              <Text className="mb-2 mt-3 text-[11px] font-semibold text-muted">
                Canlı Vital Metadata
              </Text>
              <VitalTile
                icon={Thermometer}
                label="Ateş"
                value={`${vitals.temperature.toFixed(1)} °C`}
                critical={vitals.temperature >= 38}
              />
              <VitalTile
                icon={Weight}
                label="Son Kilo"
                value={`${vitals.weightKg} kg`}
              />
              <VitalTile
                icon={Milk}
                label="Emzirme"
                value={`${vitals.feedingsPerDay} / gün`}
              />
            </View>
          </View>

          {/* Sağ: 3 yönlü yönlendirme */}
          <View className={wide ? "flex-1" : ""}>
            <View className="rounded-2xl border border-line bg-white p-4">
              <Text className="mb-3 text-sm font-bold text-ink">
                Yönlendirme Kararı (3 Yönlü)
              </Text>
              {REFERRAL_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                const active = issued?.level === btn.level;
                return (
                  <Pressable
                    key={btn.level}
                    onPress={() => decide(btn.level)}
                    className="mb-2 flex-row items-center rounded-xl px-4 py-3"
                    style={{ backgroundColor: btn.bg, opacity: active ? 1 : 0.92 }}
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
                    Annenin ekranına canlı iletildi
                  </Text>
                  <Barcode value={issued.code} width={220} />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Text className="mt-3 text-center text-[10px] text-muted">
          Ebe/hemşire paneli aynı tarayıcıdaki anne uygulamasıyla canlı kanal
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

function VitalTile({
  icon: Icon,
  label,
  value,
  critical = false,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  critical?: boolean;
}) {
  return (
    <View
      className={`mb-2 flex-row items-center rounded-xl px-3 py-2 ${
        critical ? "bg-danger/10" : "bg-surface"
      }`}
    >
      <Icon size={15} color={critical ? "#dc2626" : "#BE123C"} />
      <Text className="ml-2 flex-1 text-[11px] font-semibold text-ink">
        {label}
      </Text>
      <Text
        className={`text-[11px] font-bold ${
          critical ? "text-danger" : "text-ink"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
