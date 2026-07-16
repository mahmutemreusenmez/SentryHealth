import {
  Baby,
  Bell,
  Home,
  Hospital,
  LogOut,
  PhoneOff,
  Siren,
  Stethoscope,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Barcode from "../components/Barcode";
import LanguageSwitcher from "../components/LanguageSwitcher";
import LiveVideoPanel from "../components/LiveVideoPanel";
import { PressableScale } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../i18n/LocaleContext";
import type { ReferralLevel, TriageReferral } from "../data/types";
import { tapFeedback } from "../services/hapticsService";
import { BABY_LOBBY_ROOM, LOBBY_ROOM } from "../services/rtcConfig";
import { buildReferral, triageChannel } from "../services/triageChannel";
import { useDoctorLobby, type IncomingCall } from "../services/useDoctorLobby";

const REFERRAL_BUTTONS: {
  level: ReferralLevel;
  label: string;
  icon: typeof Siren;
  bg: string;
}[] = [
  { level: "emergency", label: "Acil Sevk", icon: Siren, bg: "#dc2626" },
  { level: "clinic", label: "Poliklinik Sevk", icon: Hospital, bg: "#d97706" },
  { level: "home", label: "Evde Takip", icon: Home, bg: "#00875A" },
];

/**
 * SentryMD Mobil Hekim Paneli — giriş yapan hekimin (rol: doctor) ana ekranı.
 *
 * `useDoctorLobby` ile kronik ve yeni doğan lobilerinden gelen canlı triyaj
 * çağrılarını gerçek zamanlı dinler; her yeni çağrıda push-banner + haptic
 * tetiklenir. Hekim "Kabul Et" dediğinde ilgili `call-*` odasına alıcı
 * (receiver) modda katılır ve WebRTC görüşme kurulur; görüşme sırasında 3 yönlü
 * sevk kararı hastaya canlı barkod olarak iletilir.
 */
export default function DoctorHomeScreen() {
  const { auth, logout } = useAuth();
  const { t } = useLocale();
  const { queue, connected, dismiss } = useDoctorLobby();
  const [activeCall, setActiveCall] = useState<IncomingCall | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [issued, setIssued] = useState<TriageReferral | null>(null);

  const accept = (call: IncomingCall) => {
    tapFeedback();
    setIssued(null);
    setStatus(null);
    setActiveCall(call);
    dismiss(call.roomId);
  };

  const endCall = () => {
    setActiveCall(null);
    setStatus(null);
    setIssued(null);
  };

  const decide = (level: ReferralLevel) => {
    const referral = buildReferral(level);
    triageChannel.publish(referral);
    setIssued(referral);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Başlık + dil seçici + çıkış */}
        <View className="mb-4 flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-blue-light">
            <Stethoscope size={22} color="#0369a1" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">{t("doctor.title")}</Text>
            <Text className="text-xs text-muted">{t("doctor.subtitle")}</Text>
          </View>
          <LanguageSwitcher compact />
        </View>

        <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
          <View className="flex-row items-center">
            <View
              className={`mr-2 h-2.5 w-2.5 rounded-full ${
                connected ? "bg-brand" : "bg-gray-300"
              }`}
            />
            <Text className="text-xs font-semibold text-ink">
              {auth.nationalId ? `Dr. ${auth.nationalId}` : "SentryMD"}
            </Text>
          </View>
          <PressableScale
            onPress={logout}
            accessibilityRole="button"
            accessibilityLabel={t("doctor.logout")}
            className="flex-row items-center rounded-xl border border-line bg-white px-3 py-2"
          >
            <LogOut size={14} color="#6b7280" />
            <Text className="ml-1.5 text-xs font-semibold text-muted">
              {t("doctor.logout")}
            </Text>
          </PressableScale>
        </View>

        {activeCall ? (
          <CallView
            call={activeCall}
            status={status}
            issued={issued}
            onStatus={setStatus}
            onDecide={decide}
            onEnd={endCall}
          />
        ) : (
          <QueueView queue={queue} onAccept={accept} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QueueView({
  queue,
  onAccept,
}: {
  queue: IncomingCall[];
  onAccept: (call: IncomingCall) => void;
}) {
  const { t } = useLocale();
  return (
    <View>
      <View className="mb-3 flex-row items-center">
        <Bell size={16} color="#0369a1" />
        <Text className="ml-2 text-sm font-bold text-ink">
          {t("doctor.queueTitle")}
        </Text>
        {queue.length > 0 ? (
          <View className="ml-2 h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5">
            <Text className="text-[11px] font-bold text-white">{queue.length}</Text>
          </View>
        ) : null}
      </View>

      {queue.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-line bg-white p-6">
          <Bell size={26} color="#9ca3af" />
          <Text className="mt-3 text-center text-xs leading-5 text-muted">
            {t("doctor.queueEmpty")}
          </Text>
        </View>
      ) : (
        queue.map((call) => {
          const isBaby = call.lobby === "baby";
          const Icon = isBaby ? Baby : Stethoscope;
          return (
            <View
              key={call.roomId}
              className="mb-3 rounded-2xl border border-danger bg-white p-4"
            >
              <View className="mb-2 flex-row items-center">
                <View className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-danger/10">
                  <Icon size={18} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink">
                    {call.patient.name} · {t("doctor.incomingCall")}
                  </Text>
                  <Text className="text-[11px] text-muted">
                    {isBaby ? t("doctor.lobbyBaby") : t("doctor.lobbyChronic")}
                  </Text>
                </View>
                <View className="flex-row items-center rounded-full bg-danger px-2.5 py-1">
                  <View className="mr-1.5 h-2 w-2 rounded-full bg-white" />
                  <Text className="text-[10px] font-bold text-white">CANLI</Text>
                </View>
              </View>

              {call.metadata ? (
                <Text className="mb-3 text-[11px] leading-5 text-ink">
                  {call.metadata}
                </Text>
              ) : null}

              <PressableScale
                onPress={() => onAccept(call)}
                accessibilityRole="button"
                accessibilityLabel={t("doctor.accept")}
                className="flex-row items-center justify-center rounded-xl bg-brand py-3.5"
              >
                <Stethoscope size={17} color="#ffffff" />
                <Text className="ml-2 text-sm font-bold text-white">
                  {t("doctor.accept")}
                </Text>
              </PressableScale>
            </View>
          );
        })
      )}
    </View>
  );
}

function CallView({
  call,
  status,
  issued,
  onStatus,
  onDecide,
  onEnd,
}: {
  call: IncomingCall;
  status: string | null;
  issued: TriageReferral | null;
  onStatus: (message: string) => void;
  onDecide: (level: ReferralLevel) => void;
  onEnd: () => void;
}) {
  const { t } = useLocale();
  const lobbyRoom = call.lobby === "baby" ? BABY_LOBBY_ROOM : LOBBY_ROOM;

  return (
    <View>
      <View
        className="mb-4 justify-end overflow-hidden rounded-3xl bg-ink"
        style={{ height: 300 }}
      >
        <LiveVideoPanel
          active
          muted={false}
          roomId={call.roomId}
          lobbyRoom={lobbyRoom}
          mode="receiver"
          role="doctor"
          onStatus={onStatus}
        />
        <View className="absolute left-3 top-3 flex-row items-center rounded-full bg-danger px-3 py-1">
          <View className="mr-2 h-2 w-2 rounded-full bg-white" />
          <Text className="text-[11px] font-semibold text-white">
            {status ?? t("doctor.connecting")}
          </Text>
        </View>
      </View>

      <View className="mb-3 rounded-2xl border border-line bg-white p-4">
        <Text className="text-sm font-bold text-ink">{call.patient.name}</Text>
        <Text className="mt-0.5 text-[11px] text-muted">
          {call.lobby === "baby" ? t("doctor.lobbyBaby") : t("doctor.lobbyChronic")}
        </Text>
        {call.metadata ? (
          <Text className="mt-2 text-[11px] leading-5 text-ink">{call.metadata}</Text>
        ) : null}
      </View>

      <View className="rounded-2xl border border-line bg-white p-4">
        <Text className="mb-3 text-sm font-bold text-ink">
          {t("doctor.referralTitle")}
        </Text>
        {REFERRAL_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const active = issued?.level === btn.level;
          return (
            <PressableScale
              key={btn.level}
              onPress={() => onDecide(btn.level)}
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
            </PressableScale>
          );
        })}

        {issued ? (
          <View className="mt-2 items-center rounded-2xl border border-line bg-surface p-3">
            <Text className="mb-1 text-[11px] font-semibold text-ink">
              {issued.title}
            </Text>
            <Barcode value={issued.code} width={220} />
          </View>
        ) : null}
      </View>

      <PressableScale
        onPress={onEnd}
        accessibilityRole="button"
        accessibilityLabel={t("doctor.hangup")}
        className="mt-4 flex-row items-center justify-center rounded-2xl bg-danger py-4"
      >
        <PhoneOff size={18} color="#ffffff" />
        <Text className="ml-2 text-base font-bold text-white">
          {t("doctor.hangup")}
        </Text>
      </PressableScale>
    </View>
  );
}
