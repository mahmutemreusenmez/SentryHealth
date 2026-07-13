import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, EmptyState, PriorityBadge, SectionHeader } from "../components/ui";
import { usePatient } from "../context/PatientContext";
import type { Medication } from "../data/types";
import { formatDateLong, formatTime, relativeDay } from "../utils/format";

export default function DashboardScreen() {
  const {
    profile,
    medications,
    appointments,
    recommendations,
    toggleMedicationTaken,
  } = usePatient();

  const sortedMeds = [...medications].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  const takenCount = medications.filter((m) => m.taken).length;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Karşılama başlığı */}
        <View className="mb-5">
          <Text className="text-sm text-muted">İyi günler,</Text>
          <Text className="text-2xl font-bold text-ink">
            {profile.fullName}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text className="ml-1 text-xs text-muted">
              {formatDateLong(new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* İlaç uyum özeti */}
        <View className="mb-5 rounded-2xl bg-brand p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-brand-light">Bugünkü İlaç Uyumu</Text>
              <Text className="text-2xl font-bold text-white">
                {takenCount}/{medications.length}
              </Text>
              <Text className="text-xs text-brand-light">alındı</Text>
            </View>
            <Ionicons name="medkit" size={40} color="#e6f4f5" />
          </View>
        </View>

        {/* İlaç zaman çizelgesi */}
        <SectionHeader
          title="Bugünün İlaç Zaman Çizelgesi"
          subtitle="Saatine dokunarak alındı olarak işaretleyin"
          icon="time-outline"
        />
        <View className="mb-6">
          {sortedMeds.map((med, index) => (
            <MedicationTimelineRow
              key={med.id}
              med={med}
              isLast={index === sortedMeds.length - 1}
              onToggle={() => toggleMedicationTaken(med.id)}
            />
          ))}
        </View>

        {/* Yaklaşan randevular */}
        <SectionHeader
          title="Yaklaşan Randevular"
          icon="clipboard-outline"
        />
        <View className="mb-6">
          {appointments.length === 0 ? (
            <EmptyState text="Yaklaşan randevunuz yok." />
          ) : (
            appointments
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.dateTime).getTime() -
                  new Date(b.dateTime).getTime(),
              )
              .map((apt) => (
                <Card key={apt.id} className="mb-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-ink">
                      {apt.title}
                    </Text>
                    <View className="rounded-full bg-brand-light px-2 py-1">
                      <Text className="text-[10px] font-semibold text-brand-dark">
                        {relativeDay(apt.dateTime)}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-1 text-xs text-muted">
                    {apt.department}
                  </Text>
                  <View className="mt-2 flex-row items-center">
                    <Ionicons name="location-outline" size={13} color="#6b7280" />
                    <Text className="ml-1 text-xs text-muted">
                      {apt.location}
                    </Text>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color="#6b7280"
                      style={{ marginLeft: 12 }}
                    />
                    <Text className="ml-1 text-xs text-muted">
                      {formatDateLong(apt.dateTime)} · {formatTime(apt.dateTime)}
                    </Text>
                  </View>
                </Card>
              ))
          )}
        </View>

        {/* Akıllı tetkik önerileri */}
        <SectionHeader
          title="Akıllı Tetkik Önerileri"
          subtitle="Yaşınıza ve sağlık geçmişinize göre"
          icon="pulse-outline"
        />
        <View>
          {recommendations.length === 0 ? (
            <EmptyState text="Şu an için ek tetkik önerisi bulunmuyor." />
          ) : (
            recommendations.map((rec) => (
              <Card key={rec.id} className="mb-3">
                <View className="flex-row items-start justify-between">
                  <Text className="flex-1 pr-2 text-base font-semibold text-ink">
                    {rec.title}
                  </Text>
                  <PriorityBadge priority={rec.priority} />
                </View>
                <Text className="mt-1 text-xs text-muted">
                  {rec.description}
                </Text>
                <View className="mt-2 flex-row items-center">
                  <Ionicons name="repeat-outline" size={13} color="#0a7c86" />
                  <Text className="ml-1 text-xs font-medium text-brand-dark">
                    {rec.cadence}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MedicationTimelineRow({
  med,
  isLast,
  onToggle,
}: {
  med: Medication;
  isLast: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="flex-row">
      {/* Zaman çizelgesi rayı */}
      <View className="w-16 items-center">
        <Text className="text-xs font-semibold text-ink">{med.time}</Text>
        <View
          className={`mt-1 h-4 w-4 rounded-full border-2 ${
            med.taken
              ? "border-success bg-success"
              : "border-brand bg-white"
          }`}
        />
        {!isLast ? <View className="w-0.5 flex-1 bg-gray-200" /> : null}
      </View>

      {/* İçerik kartı */}
      <Pressable onPress={onToggle} className="mb-4 flex-1">
        <Card className={med.taken ? "opacity-60" : ""}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink">
                {med.name}
              </Text>
              <Text className="text-xs text-muted">
                {med.dosage}
                {med.withFood ? " · tokken" : ""}
              </Text>
            </View>
            <Ionicons
              name={med.taken ? "checkmark-circle" : "ellipse-outline"}
              size={26}
              color={med.taken ? "#2e9e5b" : "#0a7c86"}
            />
          </View>
        </Card>
      </Pressable>
    </View>
  );
}
