import {
  Clock,
  Pill,
  Plus,
  Trash2,
  Utensils,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, PressableScale, SectionHeader } from "../components/ui";
import { usePatient } from "../context/PatientContext";
import { COLORS } from "../theme/colors";
import type { Medication, MedicationFoodTiming } from "../data/types";

const FOOD_OPTIONS: { value: MedicationFoodTiming; label: string }[] = [
  { value: "before", label: "Aç Karnına" },
  { value: "after", label: "Tok Karnına" },
  { value: "independent", label: "Fark Etmez" },
];

const FOOD_LABEL: Record<MedicationFoodTiming, string> = {
  before: "Aç karnına",
  after: "Tok karnına",
  independent: "Aç/tok fark etmez",
};

/** "HH:MM" biçim doğrulaması (00:00 - 23:59). */
function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

/**
 * İlaç Takip Sistemi (MedicationTracker) — Eczane modülünün yerini alan
 * kurumsal e-Nabız ilaç takip ekranı. Hasta ilaç adı, dozaj, periyot ve
 * açlık/tokluk durumunu girer; ilaçlar doz saatine göre kronolojik
 * "Yaklaşan İlaçlar" listesinde gösterilir.
 */
export default function MedicationScreen() {
  const {
    upcomingMedications,
    lowStockMedications,
    addMedication,
    removeMedication,
  } = usePatient();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [period, setPeriod] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [foodTiming, setFoodTiming] = useState<MedicationFoodTiming>("after");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      dosage.trim().length > 0 &&
      period.trim().length > 0 &&
      isValidTime(nextTime),
    [name, dosage, period, nextTime],
  );

  const submit = () => {
    if (!name.trim() || !dosage.trim() || !period.trim()) {
      setError("Lütfen ilaç adı, dozaj ve periyot alanlarını doldurun.");
      return;
    }
    if (!isValidTime(nextTime)) {
      setError("Doz saatini SS:DD biçiminde girin (örn. 08:30).");
      return;
    }
    addMedication({
      name: name.trim(),
      dosage: dosage.trim(),
      period: period.trim(),
      foodTiming,
      nextTime: nextTime.trim(),
    });
    setName("");
    setDosage("");
    setPeriod("");
    setNextTime("");
    setFoodTiming("after");
    setError(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4 flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-light">
            <Pill size={20} color={COLORS.brand} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">
              İlaç Takip Sistemi
            </Text>
            <Text className="text-xs text-muted">
              İlaçlarınızı ekleyin, doz saatlerini takip edin
            </Text>
          </View>
        </View>

        {/* Reçete yenileme uyarısı (stok azaldıysa) */}
        {lowStockMedications.length > 0 ? (
          <Card className="mb-5 border-danger">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-danger/10">
                <Pill size={20} color={COLORS.danger} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-danger">
                  İlacınız Azalıyor, Reçetenizi Yenileyin
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink">
                  {lowStockMedications
                    .map((m) => `${m.name} · ~${m.remaining} gün`)
                    .join(" • ")}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Yeni ilaç ekleme formu */}
        <Card className="mb-5">
          <Text className="mb-3 text-sm font-bold text-ink">Yeni İlaç Ekle</Text>

          <Field label="İlaç Adı">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Örn. Metformin 1000 mg"
              placeholderTextColor={COLORS.muted}
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              accessibilityLabel="İlaç adı"
            />
          </Field>

          <View className="flex-row">
            <View className="mr-2 flex-1">
              <Field label="Dozaj">
                <TextInput
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="1 Tablet / 2 Puf"
                  placeholderTextColor={COLORS.muted}
                  className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  accessibilityLabel="Dozaj"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Doz Saati">
                <TextInput
                  value={nextTime}
                  onChangeText={setNextTime}
                  placeholder="08:30"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  accessibilityLabel="Doz saati (SS:DD)"
                />
              </Field>
            </View>
          </View>

          <Field label="Periyot">
            <TextInput
              value={period}
              onChangeText={setPeriod}
              placeholder="Günde 2 kez / 8 saatte bir"
              placeholderTextColor={COLORS.muted}
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              accessibilityLabel="Periyot"
            />
          </Field>

          <Text className="mb-1.5 text-xs font-semibold text-muted">
            Açlık / Tokluk
          </Text>
          <View className="mb-3 flex-row">
            {FOOD_OPTIONS.map((opt) => {
              const active = foodTiming === opt.value;
              return (
                <PressableScale
                  key={opt.value}
                  onPress={() => setFoodTiming(opt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={opt.label}
                  className={`mr-2 flex-1 items-center rounded-xl border py-2.5 ${
                    active ? "border-brand bg-brand" : "border-line bg-white"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? "text-white" : "text-ink"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {error ? (
            <Text className="mb-2 text-xs font-semibold text-danger">
              {error}
            </Text>
          ) : null}

          <PressableScale
            onPress={submit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="İlacı ekle"
            className={`flex-row items-center justify-center rounded-xl py-3 ${
              canSubmit ? "bg-brand" : "bg-brand/40"
            }`}
          >
            <Plus size={17} color={COLORS.white} />
            <Text className="ml-2 text-sm font-bold text-white">İlacı Ekle</Text>
          </PressableScale>
        </Card>

        {/* Yaklaşan İlaçlar — kronolojik liste */}
        <SectionHeader
          title="Yaklaşan İlaçlar"
          subtitle="Doz saatine göre sıralı"
          icon={Clock}
        />

        {upcomingMedications.length === 0 ? (
          <Card>
            <Text className="text-xs text-muted">
              Henüz ilaç eklemediniz. Yukarıdaki formdan ilk ilacınızı ekleyin.
            </Text>
          </Card>
        ) : (
          upcomingMedications.map((med) => (
            <MedicationRow
              key={med.id}
              med={med}
              onRemove={() => removeMedication(med.id)}
            />
          ))
        )}

        <Text className="mt-3 text-center text-[10px] text-muted">
          İlaç takibiniz KVKK uyumlu şifreli yerel hafızada saklanır.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-muted">{label}</Text>
      {children}
    </View>
  );
}

const MedicationRow = React.memo(function MedicationRow({
  med,
  onRemove,
}: {
  med: Medication;
  onRemove: () => void;
}) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-center">
        <View className="mr-3 items-center rounded-xl bg-brand-light px-3 py-2">
          <Clock size={14} color={COLORS.brand} />
          <Text className="mt-0.5 text-xs font-bold text-brand-dark">
            {med.nextTime}
          </Text>
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-sm font-bold text-ink">{med.name}</Text>
          <Text className="mt-0.5 text-[11px] text-muted">
            {med.dosage} · {med.period}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Utensils size={11} color={COLORS.muted} />
            <Text className="ml-1 text-[11px] text-muted">
              {FOOD_LABEL[med.foodTiming]}
            </Text>
          </View>
        </View>
        <PressableScale
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`${med.name} ilacını kaldır`}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-danger/10"
        >
          <Trash2 size={16} color={COLORS.danger} />
        </PressableScale>
      </View>
    </Card>
  );
});
