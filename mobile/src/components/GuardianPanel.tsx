import {
  MessageSquareWarning,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import type { Guardian, GuardianAlert } from "../data/types";

/**
 * Hasta Yakını (SentryGuardian) Erişim Paneli.
 * Kayıtlı refakatçiyi, otomatik SMS bilgilendirme durumunu ve kritik/kaçırılan
 * doz senaryolarında refakatçiye gidecek otonom SMS taslaklarını gösterir.
 */
export default function GuardianPanel({
  guardian,
  alerts,
}: {
  guardian: Guardian;
  alerts: GuardianAlert[];
}) {
  return (
    <View className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-center">
        <View className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-brand-light">
          <ShieldCheck size={18} color="#BE123C" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-ink">
            Hasta Yakını (SentryGuardian)
          </Text>
          <Text className="text-xs text-muted">
            Refakatçi erişim ve bilgilendirme paneli
          </Text>
        </View>
      </View>

      {/* Kayıtlı refakatçi */}
      <View className="rounded-xl border border-line bg-surface px-3 py-3">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-light">
            <UserRound size={20} color="#0369a1" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink">
              {guardian.fullName}
            </Text>
            <Text className="text-[11px] text-muted">
              {guardian.relation} · Kayıtlı Refakatçi
            </Text>
          </View>
        </View>
        <View className="mt-2 flex-row items-center">
          <Phone size={13} color="#6b7280" />
          <Text className="ml-1.5 text-xs text-muted">{guardian.phone}</Text>
        </View>
      </View>

      {/* Otomatik SMS bilgilendirme durumu */}
      <View className="mt-3 flex-row items-center justify-between rounded-xl border border-brand-light bg-brand-light/40 px-3 py-2.5">
        <Text className="text-xs font-medium text-ink">
          Otomatik SMS Bilgilendirme Durumu
        </Text>
        <View className="flex-row items-center">
          <View
            className={`mr-1.5 h-2.5 w-2.5 rounded-full ${
              guardian.smsEnabled ? "bg-success" : "bg-muted"
            }`}
          />
          <Text
            className={`text-xs font-bold ${
              guardian.smsEnabled ? "text-brand-dark" : "text-muted"
            }`}
          >
            {guardian.smsEnabled ? "AKTİF" : "PASİF"}
          </Text>
        </View>
      </View>

      {/* Otonom SMS taslakları */}
      <View className="mt-3">
        <View className="mb-2 flex-row items-center">
          <MessageSquareWarning size={14} color="#6b7280" />
          <Text className="ml-1.5 text-[11px] font-semibold text-muted">
            Otonom SMS Taslakları (canlı)
          </Text>
        </View>
        {alerts.length === 0 ? (
          <Text className="text-[11px] text-muted">
            Şu an refakatçiye iletilecek bir bilgilendirme bulunmuyor.
          </Text>
        ) : (
          alerts.map((alert) => (
            <View
              key={alert.id}
              className={`mb-2 rounded-xl border px-3 py-2.5 ${
                alert.kind === "missed-dose"
                  ? "border-line bg-surface"
                  : "border-danger bg-danger/5"
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase ${
                  alert.kind === "missed-dose"
                    ? "text-muted"
                    : "text-danger"
                }`}
              >
                {alert.kind === "missed-dose"
                  ? "İlaç Onayı Bekliyor"
                  : "Kritik Sevk Uyarısı"}
              </Text>
              <Text className="mt-1 text-xs leading-5 text-ink">
                {alert.message}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
