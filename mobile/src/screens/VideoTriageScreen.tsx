import {
  Activity,
  Mic,
  MicOff,
  PhoneOff,
  Siren,
  Stethoscope,
  TicketCheck,
  Video,
  VideoOff,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Barcode from "../components/Barcode";
import LiveVideoPanel, { type IncomingReferral } from "../components/LiveVideoPanel";
import PermissionModal from "../components/PermissionModal";
import { PrivacyShieldModal } from "../components/PrivacyShield";
import { PressableScale } from "../components/ui";
import { usePatient } from "../context/PatientContext";
import type { ReferralLevel, TriageReferral } from "../data/types";
import { makeCallRoomId } from "../services/rtcConfig";
import { triageChannel } from "../services/triageChannel";

/** Hekim panelindeki kayıtlı demo hastasıyla eşleşen T.C. kimlik numarası. */
const TRIAGE_PATIENT_ID = "10000000000";

const ANALYSIS_LINES = [
  "Analiz Ediliyor: Ses tonunda nefes darlığı tespiti... SpO2 takibi öneriliyor.",
  "Analiz Ediliyor: Konuşma temposu normal, oksijen satürasyonu izleniyor.",
  "Analiz Ediliyor: Öksürük paterni değerlendiriliyor... Ek bulgu saptanmadı.",
  "Analiz Ediliyor: Kalp atım sesleri stabil, tansiyon geçmişiyle karşılaştırılıyor.",
];

export default function VideoTriageScreen() {
  const { profile, raiseCriticalAlert } = usePatient();
  const [active, setActive] = useState(false);
  const [privacyGate, setPrivacyGate] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [redCode, setRedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [referral, setReferral] = useState<TriageReferral | null>(null);
  const [permissionModal, setPermissionModal] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);

  // İzin reddedilince uygulamayı çökertme; şık izin talep modalı göster.
  const onPanelError = useCallback((message: string) => {
    setError(message);
    if (message.includes("izn") || message.includes("desteklemiyor")) {
      setPermissionModal(true);
    }
  }, []);

  // "İzin Ver ve Tekrar Dene": paneli yeniden kur (getUserMedia yeniden istenir).
  const retryPermission = useCallback(() => {
    setPermissionModal(false);
    setError(null);
    setAttemptKey((k) => k + 1);
  }, []);

  // Hastanın canlı metadata'sı (hekim ekranına aktarılır).
  const metadata = useMemo(() => {
    const chronic =
      profile.chronicConditions.length > 0
        ? profile.chronicConditions.join(", ")
        : "Kronik tanı yok";
    return `Hasta ${profile.fullName} · Yaş ${profile.age} · ${chronic}`;
  }, [profile.fullName, profile.age, profile.chronicConditions]);

  // Hekim panelinden (web sitesi) sinyal üzerinden gelen canlı sevk kararı.
  const onIncomingReferral = useCallback((incoming: IncomingReferral) => {
    const level: ReferralLevel =
      incoming.level === "emergency" || incoming.level === "clinic"
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

  // Hekim panelinden gelen canlı sevk kararını dinle (barkod ekranda belirir).
  useEffect(() => {
    const unsubscribe = triageChannel.subscribe((next) => {
      setReferral(next);
    });
    return unsubscribe;
  }, []);

  const referralAccent =
    referral?.level === "emergency"
      ? "#dc2626"
      : referral?.level === "clinic"
        ? "#d97706"
        : "#00875A";

  // Görüşme başına benzersiz, canlı bir çağrı odası (her denemede yenilenir).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const roomId = useMemo(() => makeCallRoomId(), [attemptKey]);

  // Hekim paneline duyurulacak hasta kimliği.
  const patient = useMemo(
    () => ({ nationalId: TRIAGE_PATIENT_ID, name: profile.fullName }),
    [profile.fullName],
  );

  const onRedCode = () => {
    setRedCode(true);
    raiseCriticalAlert();
  };

  // Canlı görüşme öncesi KVKK/GDPR "Privacy Shield" bilgilendirmesini göster.
  const startCall = () => {
    setError(null);
    setPrivacyGate(true);
  };

  const confirmPrivacyAndConnect = () => {
    setPrivacyGate(false);
    setActive(true);
  };

  const endCall = () => {
    setActive(false);
    setMuted(false);
    setRedCode(false);
  };

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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Başlık */}
        <View className="mb-4 flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-light">
            <Stethoscope size={20} color="#006644" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">
              Canlı Triyaj Odası
            </Text>
            <Text className="text-xs text-muted">
              Yapay Zeka Hekimi Bağlantısı · WebRTC
            </Text>
          </View>
        </View>

        {/* Video görünümü penceresi */}
        <View
          className="justify-end overflow-hidden rounded-3xl bg-ink p-4"
          style={{ height: 380 }}
        >
          {/* Gerçek canlı kamera akışı (aktifken) */}
          <LiveVideoPanel
            key={attemptKey}
            active={active}
            muted={muted}
            roomId={roomId}
            role="patient"
            patient={patient}
            metadata={metadata}
            onError={onPanelError}
            onStatus={setStatus}
            onReferral={onIncomingReferral}
          />

          {/* Merkezdeki durum (yalnızca görüşme başlamadan) */}
          {!active ? (
            <View className="flex-1 items-center justify-center">
              <View className="h-24 w-24 items-center justify-center rounded-full bg-white/10">
                <VideoOff size={44} color="#9ca3af" />
              </View>
              <Text className="mt-4 text-sm font-semibold text-white">
                Görüşme başlatılmadı
              </Text>
              <Text className="mt-1 px-6 text-center text-xs text-white/60">
                {error ?? "Başlatmak için aşağıdaki butona dokunun (kamera ve mikrofon izni istenecektir)."}
              </Text>
            </View>
          ) : null}

          {/* Üst durum çubuğu (video üzerinde) */}
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
                {active ? status ?? "CANLI" : "Bağlantı bekleniyor"}
              </Text>
            </View>
            <View className="flex-row items-center rounded-full bg-white/15 px-3 py-1">
              <Activity size={13} color="#ffffff" />
              <Text className="ml-1 text-[11px] text-white">SpO₂ · Nabız</Text>
            </View>
          </View>

          {/* Akan klinik not altyazısı (video üzerinde) */}
          {active ? (
            <View className="rounded-2xl bg-black/50 px-4 py-3">
              <Text className="text-[11px] font-semibold text-brand">
                Klinik Not (Otomatik) · Oda: {roomId}
              </Text>
              <Text className="mt-1 text-xs leading-5 text-white">
                {ANALYSIS_LINES[lineIndex]}
              </Text>
              {redCode ? (
                <View className="mt-2 flex-row items-center rounded-lg bg-danger px-3 py-2">
                  <Siren size={14} color="#ffffff" />
                  <Text className="ml-2 flex-1 text-[11px] font-semibold text-white">
                    Kırmızı kod sevk kararı verildi — refakatçiye otomatik SMS
                    taslağı oluşturuldu.
                  </Text>
                </View>
              ) : (
                <PressableScale
                  onPress={onRedCode}
                  className="mt-2 flex-row items-center justify-center rounded-lg border border-danger bg-danger/20 px-3 py-2"
                >
                  <Siren size={14} color="#fecaca" />
                  <Text className="ml-2 text-[11px] font-semibold text-white">
                    Kırmızı Kod Sevk Kararı (Refakatçiyi Bilgilendir)
                  </Text>
                </PressableScale>
              )}
            </View>
          ) : null}
        </View>

        {/* Kontroller */}
        <View className="mt-4 flex-row items-center justify-center">
          <PressableScale
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
          </PressableScale>

          {active ? (
            <PressableScale
              onPress={endCall}
              className="flex-row items-center rounded-full bg-danger px-8 py-4"
            >
              <PhoneOff size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-semibold text-white">
                Görüşmeyi Bitir
              </Text>
            </PressableScale>
          ) : (
            <PressableScale
              onPress={startCall}
              className="flex-row items-center rounded-full bg-brand px-8 py-4"
            >
              <Video size={20} color="#ffffff" />
              <Text className="ml-2 text-base font-semibold text-white">
                Görüşmeyi Başlat
              </Text>
            </PressableScale>
          )}
        </View>

        {/* Hekimden gelen canlı sevk barkodu */}
        {referral ? (
          <View
            className="mt-4 items-center rounded-2xl border bg-white p-4"
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
            <Text className="mb-3 px-2 text-center text-[11px] leading-5 text-ink">
              {referral.message}
            </Text>
            <Barcode value={referral.code} width={240} color={referralAccent} />
            <Text className="mt-2 text-[10px] text-muted">
              Hekim tarafından canlı olarak düzenlendi
            </Text>
          </View>
        ) : null}

        <Text className="mt-3 text-center text-[11px] text-muted">
          Görüntülü görüşme, SentryHealth web sitesinin WebRTC sinyal sunucusu
          (/api/webrtc/signaling) üzerinden hekim paneline canlı bağlanır. Yapay
          zeka analizi bir simülasyondur; gerçek tıbbi teşhis yerine geçmez.
        </Text>
      </ScrollView>

      <PrivacyShieldModal
        visible={privacyGate}
        onAccept={confirmPrivacyAndConnect}
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
