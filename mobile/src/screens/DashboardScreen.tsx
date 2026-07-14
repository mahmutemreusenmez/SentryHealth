import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Footprints,
  HeartPulse,
  Pill,
  Wind,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SectionHeader, StatusBadge } from "../components/ui";
import { usePatient } from "../context/PatientContext";
import type { HealthTask, ScreeningRecommendation } from "../data/types";
import { formatDateLong } from "../utils/format";

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
  const { profile, tasks, appointment, recommendations, completeTask } =
    usePatient();
  const firstName = profile.fullName.split(" ")[0];

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
          </View>
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
              onComplete={() => completeTask(task.id)}
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
            recommendations.map((rec) => <ScreeningCard key={rec.id} rec={rec} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScreeningCard({ rec }: { rec: ScreeningRecommendation }) {
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
      </View>
    </View>
  );
}

function TaskRow({
  task,
  isLast,
  onComplete,
}: {
  task: HealthTask;
  isLast: boolean;
  onComplete: () => void;
}) {
  const Icon = CATEGORY_ICON[task.category];
  const done = task.status === "done";

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
            onPress={onComplete}
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
}
