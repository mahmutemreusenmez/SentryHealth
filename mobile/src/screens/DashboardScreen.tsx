import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Activity,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Footprints,
  HeartPulse,
  Pill,
  Stethoscope,
  Volume2,
  Wind,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import React, { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GuardianPanel from "../components/GuardianPanel";
import LabAnalyzer from "../components/LabAnalyzer";
import PulseWidgets from "../components/PulseWidgets";
import VoiceConfirmButton from "../components/VoiceConfirmButton";
import WeeklyCompliance from "../components/WeeklyCompliance";
import { SectionHeader, StatusBadge } from "../components/ui";
import { usePatient } from "../context/PatientContext";
import { WEEKLY_COMPLIANCE } from "../data/mockData";
import type {
  HealthTask,
  RootStackParamList,
  RootTabParamList,
  ScreeningRecommendation,
} from "../data/types";
import { speak } from "../services/speechService";
import { formatDateLong } from "../utils/format";

type DashboardNav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, "Dashboard">,
  NativeStackNavigationProp<RootStackParamList>
>;

const CATEGORY_ICON: Record<HealthTask["category"], LucideIcon> = {
  measurement: HeartPulse,
  medication: Pill,
  activity: Footprints,
};

function honorific(gender: string): string {
  if (gender === "male") return "Bey";
  if (gender === "female") return "Hanım";
  return "";
}

export default function DashboardScreen() {
  const {
    profile,
    tasks,
    appointment,
    recommendations,
    guardian,
    guardianAlerts,
    completeTask,
    sendTestNotification,
    lowStockMedications,
  } = usePatient();
  const navigation = useNavigation<DashboardNav>();
  const firstName = profile.fullName.split(" ")[0];
  const title = honorific(profile.gender);

  const speakAppointment = useCallback(() => {
    speak(
      `${firstName} ${title}, ${appointment.dayLabel} saat ${appointment.time} ${appointment.department} kontrolünüz var. MHRS öncelikli sıra numaranız ${appointment.queueNo}.`,
    );
  }, [firstName, title, appointment]);

  const speakScreening = useCallback((rec: ScreeningRecommendation) => {
    speak(`${rec.title}. ${rec.cadence}. ${rec.reason}.`);
  }, []);

  const speakTask = useCallback(
    (task: HealthTask) => {
      speak(
        `${firstName} ${title}, ${task.time} ${task.title} vaktiniz geldi. ${task.detail}. Lütfen alıp onaylayın.`,
      );
    },
    [firstName, title],
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* e-Nabız kurumsal başlık */}
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm text-muted">Sağlıklı Günler,</Text>
            <Text className="text-2xl font-bold text-ink">
              {firstName} {honorific(profile.gender)}
            </Text>
            <Text className="mt-1 text-xs text-muted">
              {formatDateLong(new Date().toISOString())}
            </Text>
          </View>
          <View className="flex-row items-center rounded-xl border border-brand-light bg-white px-3 py-2">
            <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-brand">
              <HeartPulse size={16} color="#ffffff" />
            </View>
            <View>
              <Text className="text-xs font-bold text-brand-dark">e-Nabız</Text>
              <Text className="text-[9px] text-muted">Sağlık Kaydı</Text>
            </View>
          </View>
        </View>

        {/* Jüri için canlı push bildirim simülatörü */}
        <Pressable
          onPress={sendTestNotification}
          className="mb-4 flex-row items-center justify-center rounded-xl border border-brand bg-brand py-3"
        >
          <BellRing size={17} color="#ffffff" />
          <Text className="ml-2 text-sm font-bold text-white">
            Test Bildirimi Gönder
          </Text>
        </Pressable>

        {/* SentryPharmacy: ilaç azalıyor uyarısı (bitmesine ≤3 gün) */}
        {lowStockMedications.length > 0 ? (
          <Pressable
            onPress={() => navigation.navigate("Pharmacy")}
            className="mb-4 flex-row items-center rounded-2xl border border-danger bg-danger/5 p-3"
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-danger/10">
              <Pill size={20} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-danger">
                İlacınız Azalıyor, Reçete Yenileyin
              </Text>
              <Text className="mt-0.5 text-[11px] text-ink">
                {lowStockMedications
                  .map((m) => `${m.name} · ~${m.remaining} gün kaldı`)
                  .join(" • ")}
              </Text>
            </View>
            <ChevronRight size={18} color="#dc2626" />
          </Pressable>
        ) : null}

        {/* SentryPulse: giyilebilir cihaz canlı vitalleri */}
        <PulseWidgets
          onNavigateTriage={() => navigation.navigate("Triage")}
        />

        {/* Sesli İlaç Onay Modülü */}
        <VoiceConfirmButton />

        {/* SentryLens: tahlil raporu yükleme + AI analiz */}
        <LabAnalyzer />

        {/* Yaklaşan randevu (MHRS) */}
        <View className="mb-6 rounded-2xl bg-blue p-4 shadow-sm">
          <View className="flex-row items-center">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/20">
              <CalendarClock size={22} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-blue-light">Yaklaşan Randevu</Text>
              <Text className="text-base font-bold text-white">
                {appointment.dayLabel} {appointment.time} — {appointment.title}
              </Text>
              <Text className="mt-0.5 text-xs text-blue-light">
                {appointment.department} · MHRS Öncelikli Sıra No:{" "}
                {appointment.queueNo}
              </Text>
            </View>
            <Pressable
              onPress={speakAppointment}
              accessibilityRole="button"
              accessibilityLabel="Randevuyu sesli oku"
              hitSlop={8}
              className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-white/20"
            >
              <Volume2 size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Haftalık ilaç uyum çizelgesi ve dinamik sağlık skoru */}
        <View className="mb-6">
          <SectionHeader
            title="Haftalık Uyum Çizelgesi"
            subtitle="Pazartesi - Pazar ilaç uyumunuz"
            icon={Activity}
          />
          <WeeklyCompliance days={WEEKLY_COMPLIANCE} />
        </View>

        {/* Bugünkü sağlık görevleri zaman tüneli */}
        <SectionHeader
          title="Bugünkü Sağlık Görevleriniz"
          subtitle="Zaman tüneli"
          icon={Activity}
        />
        <View>
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              isLast={index === tasks.length - 1}
              onComplete={completeTask}
              onSpeak={speakTask}
            />
          ))}
        </View>

        {/* Yaş/kronik duruma göre anlık düşen zorunlu tetkik görevleri */}
        <View className="mt-4">
          <SectionHeader
            title="Belli Yaş Üstü Zorunlu Tetkikler"
            subtitle={`Yaş ${profile.age} · profil verinize göre otomatik`}
            icon={ClipboardList}
          />
          {recommendations.length === 0 ? (
            <View className="rounded-2xl border border-line bg-white p-4">
              <Text className="text-xs text-muted">
                Şu an için düşen zorunlu tetkik görevi bulunmuyor.
              </Text>
            </View>
          ) : (
            recommendations.map((rec) => (
              <ScreeningCard key={rec.id} rec={rec} onSpeak={speakScreening} />
            ))
          )}
        </View>

        {/* Hasta Yakını (SentryGuardian) Erişim Paneli */}
        <View className="mt-6">
          <GuardianPanel guardian={guardian} alerts={guardianAlerts} />
        </View>

        {/* SentryMD: Triyaj Hekimi Paneli (/doctor-panel) */}
        <Pressable
          onPress={() => navigation.navigate("DoctorPanel")}
          className="mt-6 flex-row items-center justify-center rounded-xl border border-blue bg-white py-3"
        >
          <Stethoscope size={16} color="#0284c7" />
          <Text className="ml-2 text-sm font-bold text-blue-dark">
            SentryMD Hekim Panelini Aç
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const ScreeningCard = React.memo(function ScreeningCard({
  rec,
  onSpeak,
}: {
  rec: ScreeningRecommendation;
  onSpeak: (rec: ScreeningRecommendation) => void;
}) {
  return (
    <View className="mb-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
      <View className="flex-row items-center">
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-blue-light">
          <ClipboardList size={18} color="#0369a1" />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-sm font-semibold text-ink">{rec.title}</Text>
          <Text className="mt-0.5 text-[11px] text-muted">
            {rec.cadence} · {rec.reason}
          </Text>
        </View>
        <StatusBadge recommendation={rec} />
        <Pressable
          onPress={() => onSpeak(rec)}
          accessibilityRole="button"
          accessibilityLabel={`${rec.title} tetkikini sesli oku`}
          hitSlop={8}
          className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-blue-light"
        >
          <Volume2 size={15} color="#0369a1" />
        </Pressable>
      </View>
    </View>
  );
});

const TaskRow = React.memo(function TaskRow({
  task,
  isLast,
  onComplete,
  onSpeak,
}: {
  task: HealthTask;
  isLast: boolean;
  onComplete: (id: string) => void;
  onSpeak: (task: HealthTask) => void;
}) {
  const Icon = CATEGORY_ICON[task.category];
  const done = task.status === "done";
  const canSpeak = task.category === "medication" || task.category === "measurement";

  return (
    <View className="flex-row">
      {/* Zaman çizelgesi rayı */}
      <View className="w-16 items-center">
        <Text className="text-xs font-semibold text-ink">{task.time}</Text>
        <View
          className={`mt-1 h-4 w-4 rounded-full border-2 ${
            done
              ? "border-brand bg-brand"
              : task.status === "pending"
                ? "border-blue bg-white"
                : "border-brand-light bg-white"
          }`}
        />
        {!isLast ? <View className="w-0.5 flex-1 bg-line" /> : null}
      </View>

      {/* İçerik kartı */}
      <View className="mb-4 flex-1 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <View className="flex-row items-center">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-surface">
            <Icon size={18} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink">
              {task.title}
            </Text>
            {task.detail ? (
              <Text className="text-xs text-muted">{task.detail}</Text>
            ) : null}
          </View>

          {canSpeak ? (
            <Pressable
              onPress={() => onSpeak(task)}
              accessibilityRole="button"
              accessibilityLabel={`${task.title} hatırlatıcısını sesli oku`}
              hitSlop={8}
              className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-brand-light"
            >
              <Volume2 size={15} color="#059669" />
            </Pressable>
          ) : null}

          {done ? (
            <View className="flex-row items-center">
              <CheckCircle2 size={22} color="#10b981" />
            </View>
          ) : null}
        </View>

        {/* Durum: ölçüldü / bekliyor (mavi buton) / öneri */}
        {done ? (
          <Text className="mt-2 text-xs font-semibold text-brand-dark">
            Tamamlandı
          </Text>
        ) : task.status === "pending" ? (
          <Pressable
            onPress={() => onComplete(task.id)}
            className="mt-3 flex-row items-center justify-center rounded-xl bg-blue py-2"
          >
            <CheckCircle2 size={16} color="#ffffff" />
            <Text className="ml-2 text-sm font-semibold text-white">
              Aldım / Tamamladım
            </Text>
            <ChevronRight size={16} color="#ffffff" />
          </Pressable>
        ) : (
          <View className="mt-3 flex-row items-center rounded-xl bg-blue-light px-3 py-2">
            <Wind size={15} color="#0369a1" />
            <Text className="ml-2 flex-1 text-xs text-blue-dark">
              {task.note}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});
