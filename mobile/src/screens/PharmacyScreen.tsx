import {
  MapPin,
  Navigation,
  Phone,
  Pill,
  Clock,
} from "lucide-react-native";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, SectionHeader } from "../components/ui";
import { usePatient } from "../context/PatientContext";
import { NOBETCI_PHARMACIES } from "../data/mockData";
import type { PharmacyInfo } from "../data/types";

/** Simüle edilmiş kullanıcı konumu (Ankara, Çankaya merkez). */
const SIM_LOCATION = { label: "Çankaya, Ankara (simüle konum)" };

/**
 * SentryPharmacy — Nöbetçi Eczaneler sekmesi.
 * Simüle GPS konumuna göre en yakın nöbetçi eczaneleri; isim, telefon, adres
 * ve rota tarifi butonuyla temiz bir liste halinde gösterir. Ayrıca ilaç stoku
 * azalan hastaya reçete yenileme uyarısı verir.
 */
export default function PharmacyScreen() {
  const { lowStockMedications } = usePatient();

  const call = (phone: string) => {
    void Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };

  const route = (pharmacy: PharmacyInfo) => {
    const query = encodeURIComponent(`${pharmacy.name} ${pharmacy.address}`);
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${pharmacy.lat},${pharmacy.lng}&q=${query}`
        : `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lng}`;
    void Linking.openURL(url);
  };

  const sorted = [...NOBETCI_PHARMACIES].sort(
    (a, b) => a.distanceKm - b.distanceKm,
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <View className="mb-4 flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-light">
            <MapPin size={20} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">
              Nöbetçi Eczaneler
            </Text>
            <Text className="text-xs text-muted">{SIM_LOCATION.label}</Text>
          </View>
        </View>

        {lowStockMedications.length > 0 ? (
          <Card className="mb-5 border-danger">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-danger/10">
                <Pill size={20} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-danger">
                  İlacınız Azalıyor, Reçete Yenileyin
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink">
                  {lowStockMedications
                    .map(
                      (m) =>
                        `${m.name} · ~${m.remaining} gün`,
                    )
                    .join(" • ")}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <SectionHeader
          title="Size En Yakın Açık Eczaneler"
          subtitle="Uzaklığa göre sıralı"
          icon={Clock}
        />

        {sorted.map((pharmacy) => (
          <Card key={pharmacy.id} className="mb-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-bold text-ink">
                  {pharmacy.name}
                </Text>
                <Text className="mt-0.5 text-[11px] text-muted">
                  {pharmacy.address}
                </Text>
              </View>
              <View className="rounded-full bg-brand-light px-2.5 py-1">
                <Text className="text-[10px] font-bold text-brand-dark">
                  {pharmacy.distanceKm.toFixed(1)} km
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row">
              <Pressable
                onPress={() => call(pharmacy.phone)}
                className="mr-2 flex-1 flex-row items-center justify-center rounded-xl border border-line bg-white py-2.5"
              >
                <Phone size={15} color="#0284c7" />
                <Text className="ml-2 text-xs font-semibold text-blue-dark">
                  Ara
                </Text>
              </Pressable>
              <Pressable
                onPress={() => route(pharmacy)}
                className="flex-1 flex-row items-center justify-center rounded-xl bg-brand py-2.5"
              >
                <Navigation size={15} color="#ffffff" />
                <Text className="ml-2 text-xs font-bold text-white">
                  Rota Tarifi
                </Text>
              </Pressable>
            </View>
          </Card>
        ))}

        <Text className="mt-2 text-center text-[10px] text-muted">
          Konum ve nöbetçi eczane verileri jüri sunumu için simüle edilmiştir.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
