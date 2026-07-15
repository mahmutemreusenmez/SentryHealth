import { Mic, MicOff } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { usePatient } from "../context/PatientContext";
import { speak } from "../services/speechService";
import {
  isVoiceRecognitionSupported,
  listenOnce,
} from "../services/voiceService";
import { Card, SectionHeader } from "./ui";

type Phase = "idle" | "listening" | "done" | "error";

/**
 * Sesli İlaç Onay Modülü — büyük mikrofon butonu. Kullanıcı "İlacımı içtim" ya
 * da "Tansiyonumu ölçtüm" dediğinde ilgili bekleyen görev otomatik onaylanır.
 * Web'de gerçek ses tanıma, native'de güvenli geri düşüş kullanılır.
 */
export default function VoiceConfirmButton() {
  const { confirmByVoice } = usePatient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("");
  const cancelRef = useRef<(() => void) | null>(null);
  const supported = isVoiceRecognitionSupported();

  const startListening = useCallback(() => {
    if (phase === "listening") return;
    setPhase("listening");
    setMessage("Dinleniyor... Lütfen konuşun.");

    const { promise, cancel } = listenOnce();
    cancelRef.current = cancel;

    promise
      .then((result) => {
        const confirmed = confirmByVoice(result.command);
        if (confirmed) {
          const text = `${confirmed.title} onaylandı. Teşekkürler.`;
          setPhase("done");
          setMessage(`“${result.transcript}” → ${text}`);
          speak(text);
        } else if (result.command === "unknown") {
          setPhase("error");
          setMessage(
            `“${result.transcript}” anlaşılamadı. "İlacımı içtim" veya "Tansiyonumu ölçtüm" deyin.`,
          );
        } else {
          setPhase("done");
          setMessage(
            `“${result.transcript}” alındı, ancak onaylanacak bekleyen görev yok.`,
          );
        }
      })
      .catch(() => {
        setPhase("error");
        setMessage(
          "Ses alınamadı. Mikrofon izni verildiğinden emin olup tekrar deneyin ya da görevi elle onaylayın.",
        );
      })
      .finally(() => {
        cancelRef.current = null;
      });
  }, [phase, confirmByVoice]);

  const listening = phase === "listening";

  return (
    <Card className="mb-5">
      <SectionHeader
        title="Sesli İlaç Onayı"
        subtitle="Mikrofona basıp “İlacımı içtim” deyin"
        icon={Mic}
      />

      <View className="items-center py-2">
        <Pressable
          onPress={startListening}
          disabled={listening}
          accessibilityRole="button"
          accessibilityLabel="Sesli komutla görev onayla"
          className={`h-24 w-24 items-center justify-center rounded-full ${
            listening ? "bg-danger" : "bg-brand"
          }`}
        >
          {listening ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Mic size={40} color="#ffffff" />
          )}
        </Pressable>
        <Text className="mt-3 text-xs font-semibold text-ink">
          {listening ? "Dinleniyor..." : "Konuşmak için dokunun"}
        </Text>
      </View>

      {message ? (
        <View
          className={`mt-1 rounded-xl px-3 py-2 ${
            phase === "error"
              ? "bg-danger/10"
              : phase === "done"
                ? "bg-brand-light"
                : "bg-surface"
          }`}
        >
          <Text
            className={`text-[12px] leading-5 ${
              phase === "error" ? "text-danger" : "text-ink"
            }`}
          >
            {message}
          </Text>
        </View>
      ) : null}

      {!supported ? (
        <View className="mt-2 flex-row items-center">
          <MicOff size={12} color="#6b7280" />
          <Text className="ml-1 flex-1 text-[10px] text-muted">
            Bu ortamda cihaz ses tanıma modülü yok; örnek komutla çalışır. Gerçek
            STT için dev-build gerekir. Görevleri elle de onaylayabilirsiniz.
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
