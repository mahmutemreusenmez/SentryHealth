import {
  Activity,
  Mic,
  MicOff,
  PhoneOff,
  Stethoscope,
  Video,
  VideoOff,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ANALYSIS_LINES = [
  "Analiz Ediliyor: Ses tonunda nefes darlığı tespiti... SpO2 takibi öneriliyor.",
  "Analiz Ediliyor: Konuşma temposu normal, oksijen satürasyonu izleniyor.",
  "Analiz Ediliyor: Öksürük paterni değerlendiriliyor... Ek bulgu saptanmadı.",
  "Analiz Ediliyor: Kalp atım sesleri stabil, tansiyon geçmişiyle karşılaştırılıyor.",
];

export default function VideoTriageScreen() {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);

  // Görüşme aktifken klinik analiz notu altyazı gibi akar.
  useEffect(() => {
    if (!active) {
      setLineIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setLineIndex((i) => (i + 1) % ANALYSIS_LINES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="flex-1 p-4">
        {/* Başlık */}
        <View className="mb-4 flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-light">
            <Stethoscope size={20} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">
              Canlı Triyaj Odası
            </Text>
            <Text className="text-xs text-muted">
              Yapay Zeka Hekimi Bağlantısı
            </Text>
          </View>
        </View>

        {/* Video görünümü penceresi */}
        <View className="flex-1 justify-end overflow-hidden rounded-3xl bg-ink p-4">
          {/* Üst durum çubuğu */}
          <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
            <View
              className={`flex-row items-center rounded-full px-3 py-1 ${
                active ? "bg-danger" : "bg-white/15"
              }`}
            >
              <View
                className={`mr-2 h-2 w-2 rounded-full ${
                  active ? "bg-white" : "bg-white/60"
                }`}
              />
              <Text className="text-[11px] font-semibold text-white">
                {active ? "CANLI" : "Bağlantı bekleniyor"}
              </Text>
            </View>
            <View className="flex-row items-center rounded-full bg-white/15 px-3 py-1">
              <Activity size={13} color="#ffffff" />
              <Text className="ml-1 text-[11px] text-white">SpO₂ · Nabız</Text>
            </View>
          </View>

          {/* Merkezdeki kamera simülasyonu */}
          <View className="flex-1 items-center justify-center">
            <View
              className={`h-24 w-24 items-center justify-center rounded-full ${
                active ? "bg-brand" : "bg-white/10"
              }`}
            >
              {active ? (
                <Video size={44} color="#ffffff" />
              ) : (
                <VideoOff size={44} color="#9ca3af" />
              )}
            </View>
            <Text className="mt-4 text-sm font-semibold text-white">
              {active
                ? "Yapay Zeka Hekimi bağlı"
                : "Görüşme başlatılmadı"}
            </Text>
            <Text className="mt-1 text-xs text-white/60">
              {active
                ? muted
                  ? "Mikrofonunuz kapalı"
                  : "Mikrofonunuz açık — konuşabilirsiniz"
                : "Başlatmak için aşağıdaki butona dokunun"}
            </Text>
          </View>

          {/* Akan klinik not altyazısı */}
          {active ? (
            <View className="rounded-2xl bg-black/40 px-4 py-3">
              <Text className="text-[11px] font-semibold text-brand">
                Klinik Not (Otomatik)
              </Text>
              <Text className="mt-1 text-xs leading-5 text-white">
                {ANALYSIS_LINES[lineIndex]}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Kontroller */}
        <View className="mt-4 flex-row items-center justify-center">
          <Pressable
            onPress={() => setMuted((m) => !m)}
            disabled={!active}
            className={`mr-4 h-14 w-14 items-center justify-center rounded-full ${
              !active ? "bg-gray-200" : muted ? "bg-ink" : "bg-white border border-line"
            }`}
          >
            {muted ? (
              <MicOff size={22} color="#ffffff" />
            ) : (
              <Mic size={22} color={active ? "#1f2937" : "#9ca3af"} />
            )}
          </Pressable>

          {active ? (
            <Pressable
              onPress={() => {
                setActive(false);
                setMuted(false);
              }}
              className="flex-row items-center rounded-full bg-danger px-6 py-4"
            >
              <PhoneOff size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-semibold text-white">
                Görüşmeyi Bitir
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setActive(true)}
              className="flex-row items-center rounded-full bg-brand px-6 py-4"
            >
              <Video size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-semibold text-white">
                Görüşmeyi Başlat
              </Text>
            </Pressable>
          )}
        </View>

        <Text className="mt-3 text-center text-[11px] text-muted">
          Bu ekran bir simülasyondur; gerçek tıbbi teşhis yerine geçmez.
        </Text>
      </View>
    </SafeAreaView>
  );
}
