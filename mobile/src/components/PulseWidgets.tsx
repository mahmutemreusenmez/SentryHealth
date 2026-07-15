import {
  Activity,
  Footprints,
  HeartPulse,
  Siren,
  Watch,
  Wind,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { usePatient } from "../context/PatientContext";
import type { PulseSample, WearablePermission } from "../data/types";
import {
  isCriticalHeartRate,
  requestWearablePermission,
  startPulseStream,
} from "../services/pulseService";
import { Card, SectionHeader } from "./ui";
import Sparkline from "./Sparkline";

const HISTORY_LEN = 16;

/**
 * SentryPulse — giyilebilir cihaz (HealthKit / Google Fit) simülasyon widget'ı.
 * İzin alındıktan sonra canlı Nabız/SpO2/Adım verisini gösterir; nabız kritik
 * eşiği aşınca "Kritik Vital Uyarısı" verip kullanıcıyı Triyaj'a yönlendirir.
 */
export default function PulseWidgets({
  onNavigateTriage,
}: {
  onNavigateTriage: () => void;
}) {
  const { notifyCriticalPulse } = usePatient();
  const [permission, setPermission] = useState<WearablePermission>("unknown");
  const [connecting, setConnecting] = useState(false);
  const [sample, setSample] = useState<PulseSample | null>(null);
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const [critical, setCritical] = useState(false);
  const streamRef = useRef<{ stop: () => void; triggerSpike: () => void } | null>(
    null,
  );
  const criticalRef = useRef(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    const granted = await requestWearablePermission();
    setConnecting(false);
    setPermission(granted ? "granted" : "denied");
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    const stream = startPulseStream((next) => {
      setSample(next);
      setHrHistory((prev) => [...prev, next.heartRate].slice(-HISTORY_LEN));
      if (isCriticalHeartRate(next.heartRate)) {
        if (!criticalRef.current) {
          criticalRef.current = true;
          setCritical(true);
          notifyCriticalPulse(next.heartRate);
        }
      } else {
        criticalRef.current = false;
        setCritical(false);
      }
    });
    streamRef.current = stream;
    return () => {
      stream.stop();
      streamRef.current = null;
    };
  }, [permission, notifyCriticalPulse]);

  if (permission !== "granted") {
    return (
      <Card className="mb-5">
        <SectionHeader
          title="SentryPulse · Giyilebilir Cihaz"
          subtitle="Akıllı saat vital verileri (HealthKit / Google Fit)"
          icon={Watch}
        />
        <Text className="mb-3 text-xs leading-5 text-muted">
          Nabız, oksijen (SpO₂) ve adım verilerinizi canlı izlemek için
          giyilebilir cihaz sağlık verilerine erişim izni gerekir.
        </Text>
        {permission === "denied" ? (
          <Text className="mb-2 text-[11px] font-semibold text-danger">
            İzin verilmedi. Verileri görmek için tekrar deneyin.
          </Text>
        ) : null}
        <Pressable
          onPress={connect}
          disabled={connecting}
          className={`flex-row items-center justify-center rounded-xl py-3 ${
            connecting ? "bg-brand/60" : "bg-brand"
          }`}
        >
          <Watch size={16} color="#ffffff" />
          <Text className="ml-2 text-sm font-bold text-white">
            {connecting ? "Cihaza Bağlanılıyor..." : "Cihazı Bağla ve İzin Ver"}
          </Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card className="mb-5">
      <SectionHeader
        title="SentryPulse · Canlı Vitaller"
        subtitle="Giyilebilir cihazdan anlık veri"
        icon={Watch}
      />

      <View className="flex-row justify-between">
        <VitalWidget
          icon={HeartPulse}
          color={critical ? "#dc2626" : "#00875A"}
          label="Nabız"
          value={sample ? `${sample.heartRate}` : "—"}
          unit="atım/dk"
        />
        <VitalWidget
          icon={Wind}
          color="#0284c7"
          label="SpO₂"
          value={sample ? `${sample.spo2}` : "—"}
          unit="%"
        />
        <VitalWidget
          icon={Footprints}
          color="#006644"
          label="Adım"
          value={sample ? `${sample.steps}` : "—"}
          unit="bugün"
        />
      </View>

      <View className="mt-4 rounded-2xl bg-surface p-3">
        <View className="mb-1 flex-row items-center">
          <Activity size={13} color="#6b7280" />
          <Text className="ml-1 text-[11px] font-semibold text-muted">
            Nabız Trendi
          </Text>
        </View>
        <Sparkline
          data={hrHistory}
          color={critical ? "#dc2626" : "#00875A"}
          width={280}
          height={44}
        />
      </View>

      {critical ? (
        <View className="mt-4 rounded-2xl border border-danger bg-danger/10 p-3">
          <View className="flex-row items-center">
            <Siren size={16} color="#dc2626" />
            <Text className="ml-2 flex-1 text-sm font-bold text-danger">
              Kritik Vital Uyarısı
            </Text>
          </View>
          <Text className="mt-1 text-[11px] leading-5 text-ink">
            Nabzınız {sample?.heartRate} atım/dk — kritik eşikte. Bir hekime
            bağlanmanız önerilir.
          </Text>
          <Pressable
            onPress={onNavigateTriage}
            className="mt-2 flex-row items-center justify-center rounded-xl bg-danger py-2.5"
          >
            <Siren size={15} color="#ffffff" />
            <Text className="ml-2 text-sm font-bold text-white">
              Görüntülü Triyaj'a Bağlan
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => streamRef.current?.triggerSpike()}
          className="mt-3 items-center rounded-xl border border-line py-2"
        >
          <Text className="text-[11px] font-semibold text-muted">
            Kritik Nabız Senaryosunu Simüle Et (Demo)
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

function VitalWidget({
  icon: Icon,
  color,
  label,
  value,
  unit,
}: {
  icon: typeof HeartPulse;
  color: string;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View
      className="mx-1 flex-1 items-center rounded-2xl border border-line bg-white py-3"
    >
      <Icon size={20} color={color} />
      <Text className="mt-1 text-lg font-bold text-ink">{value}</Text>
      <Text className="text-[10px] font-semibold text-muted">{label}</Text>
      <Text className="text-[9px] text-muted">{unit}</Text>
    </View>
  );
}
