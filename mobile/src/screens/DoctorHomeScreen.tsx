import {
  Baby,
  Bell,
  Home,
  Hospital,
  LogOut,
  MessageCircle,
  PhoneOff,
  Share2,
  Siren,
  Stethoscope,
  Users,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Barcode from "../components/Barcode";
import LiveChatPanel from "../components/LiveChatPanel";
import LiveVideoPanel from "../components/LiveVideoPanel";
import { PressableScale } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../i18n/LocaleContext";
import type { ReferralLevel, TriageReferral } from "../data/types";
import { tapFeedback } from "../services/hapticsService";
import { BABY_LOBBY_ROOM, LOBBY_ROOM } from "../services/rtcConfig";
import { buildReferral, triageChannel } from "../services/triageChannel";
import { useDoctorLobby, type IncomingCall } from "../services/useDoctorLobby";

/** Panele giriş yapan sağlık personelinin görev rolü. */
type StaffRole = "doctor" | "nurse" | "midwife";

const STAFF_ROLES: { role: StaffRole; key: string }[] = [
  { role: "doctor", key: "doctor.roleDoctor" },
  { role: "nurse", key: "doctor.roleNurse" },
  { role: "midwife", key: "doctor.roleMidwife" },
];

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
 * Sağlık Personeli Paneli — giriş yapan personelin (Hekim / Hemşire / Ebe)
 * ortak ana ekranı.
 *
 * `useDoctorLobby` ile genel/kronik ve yeni doğan lobilerinden gelen tüm canlı
 * destek istekleri tek bir "Gelen İstekler" kuyruğunda toplanır; her yeni
 * istekte push-banner + haptic tetiklenir. Personel isteği Hemşire/Ebe ile
 * paylaşıp koordine edebilir, "Kabul Et" ile ilgili `call-*` odasına alıcı
 * modda katılıp görüşmeyi yürütür, hasta ile canlı sohbete geçebilir ve
 * görüşme sırasında sevk kararını hastaya canlı barkod olarak iletir.
 */
export default function DoctorHomeScreen() {
  const { auth, logout } = useAuth();
  const { t } = useLocale();
  const { queue, connected, dismiss } = useDoctorLobby();
  const [role, setRole] = useState<StaffRole>("doctor");
  const [assignments, setAssignments] = useState<Record<string, StaffRole>>({});
  const [activeCall, setActiveCall] = useState<IncomingCall | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [issued, setIssued] = useState<TriageReferral | null>(null);

  const roleLabel = (r: StaffRole): string =>
    t(STAFF_ROLES.find((s) => s.role === r)?.key ?? "doctor.roleDoctor");

  const accept = (call: IncomingCall) => {
    tapFeedback();
    setIssued(null);
    setStatus(null);
    setActiveCall(call);
    dismiss(call.roomId);
  };

  // İsteği paydaş rollere (Hekim → Hemşire → Ebe → Hekim) döngüsel paylaştırır.
  const share = (call: IncomingCall) => {
    tapFeedback();
    setAssignments((prev) => {
      const order: StaffRole[] = ["doctor", "nurse", "midwife"];
      const current = prev[call.roomId];
      const next =
        order[(order.indexOf(current ?? "doctor") + 1) % order.length];
      return { ...prev, [call.roomId]: next };
    });
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
        {/* Başlık + çıkış */}
        <View className="mb-4 flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-blue-light">
            <Stethoscope size={22} color="#0369a1" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">{t("doctor.title")}</Text>
            <Text className="text-xs text-muted">{t("doctor.subtitle")}</Text>
          </View>
        </View>

        <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
          <View className="flex-row items-center">
            <View
              className={`mr-2 h-2.5 w-2.5 rounded-full ${
                connected ? "bg-brand" : "bg-gray-300"
              }`}
            />
            <Text className="text-xs font-semibold text-ink">
              {auth.nationalId
                ? `${roleLabel(role)} · ${auth.nationalId}`
                : roleLabel(role)}
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

        {/* Görev rolü seçimi (Hekim / Hemşire / Ebe) */}
        <View className="mb-4 rounded-2xl border border-line bg-white p-3">
          <View className="mb-2 flex-row items-center">
            <Users size={15} color="#0369a1" />
            <Text className="ml-2 text-xs font-bold text-ink">
              {t("doctor.roleTitle")}
            </Text>
          </View>
          <View className="flex-row">
            {STAFF_ROLES.map((s) => {
              const activeRole = s.role === role;
              return (
                <PressableScale
                  key={s.role}
                  onPress={() => setRole(s.role)}
                  className={`mr-2 flex-1 items-center rounded-xl py-2.5 ${
                    activeRole ? "bg-brand" : "bg-surface"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeRole ? "text-white" : "text-muted"
                    }`}
                  >
                    {t(s.key)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
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
          <QueueView
            queue={queue}
            assignments={assignments}
            roleLabel={roleLabel}
            onAccept={accept}
            onShare={share}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QueueView({
  queue,
  assignments,
  roleLabel,
  onAccept,
  onShare,
}: {
  queue: IncomingCall[];
  assignments: Record<string, StaffRole>;
  roleLabel: (role: StaffRole) => string;
  onAccept: (call: IncomingCall) => void;
  onShare: (call: IncomingCall) => void;
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
          const assignedTo = assignments[call.roomId];
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

              {assignedTo ? (
                <View className="mb-3 flex-row items-center rounded-xl bg-blue-light/50 px-3 py-2">
                  <Users size={13} color="#0369a1" />
                  <Text className="ml-2 text-[11px] font-semibold text-blue-dark">
                    {t("doctor.sharedWith")}: {roleLabel(assignedTo)}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row">
                <PressableScale
                  onPress={() => onShare(call)}
                  accessibilityRole="button"
                  accessibilityLabel={t("doctor.shareTitle")}
                  className="mr-2 flex-row items-center justify-center rounded-xl border border-blue bg-white px-4 py-3.5"
                >
                  <Share2 size={16} color="#0284c7" />
                  <Text className="ml-2 text-sm font-bold text-blue-dark">
                    {t("doctor.share")}
                  </Text>
                </PressableScale>
                <PressableScale
                  onPress={() => onAccept(call)}
                  accessibilityRole="button"
                  accessibilityLabel={t("doctor.accept")}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-brand py-3.5"
                >
                  <Stethoscope size={17} color="#ffffff" />
                  <Text className="ml-2 text-sm font-bold text-white">
                    {t("doctor.accept")}
                  </Text>
                </PressableScale>
              </View>
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
  const [showChat, setShowChat] = useState(false);
  const lobbyRoom = call.lobby === "baby" ? BABY_LOBBY_ROOM : LOBBY_ROOM;

  return (
    <View>
      <View
        className="mb-4 justify-end overflow-hidden rounded-3xl bg-ink p-3"
        style={{ height: 380 }}
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

      {/* Hasta ile canlı sohbete geçiş */}
      <PressableScale
        onPress={() => setShowChat((s) => !s)}
        accessibilityRole="button"
        accessibilityLabel={t("doctor.chatOpen")}
        className="mb-3 flex-row items-center justify-center rounded-2xl border border-blue bg-white py-3.5"
      >
        <MessageCircle size={17} color="#0284c7" />
        <Text className="ml-2 text-sm font-bold text-blue-dark">
          {showChat ? t("doctor.chatBack") : t("doctor.chatOpen")}
        </Text>
      </PressableScale>

      {showChat ? (
        <View className="mb-3">
          <LiveChatPanel
            roomId={call.roomId}
            from="staff"
            title={t("doctor.chatTitle")}
          />
        </View>
      ) : null}

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
