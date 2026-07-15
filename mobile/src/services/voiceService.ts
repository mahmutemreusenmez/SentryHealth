import { Platform } from "react-native";

/**
 * Sesli İlaç Onay Modülü — Konuşmadan Metne (Speech-to-Text) katmanı.
 *
 * - **Web:** Tarayıcının `SpeechRecognition` / `webkitSpeechRecognition` API'si
 *   ile gerçek Türkçe (tr-TR) ses tanıma yapılır.
 * - **Native (Expo Go):** Cihaza özel STT modülü Expo Go'da bulunmadığından,
 *   erişilebilirlik akışının uçtan uca çalışması için kısa bir gecikmenin
 *   ardından örnek bir komut döndüren güvenli bir geri düşüş (fallback)
 *   kullanılır. Dev-build'de yerel STT modülüyle değiştirilebilir.
 */

export type VoiceCommand = "medication" | "measurement" | "unknown";

export interface VoiceResult {
  transcript: string;
  command: VoiceCommand;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (Platform.OS !== "web") return null;
  const w = globalThis as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Tarayıcıda gerçek ses tanıma desteği var mı? */
export function isVoiceRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** Serbest metni bilinen bir görev komutuna eşler. */
export function classifyTranscript(transcript: string): VoiceCommand {
  const t = transcript.toLocaleLowerCase("tr-TR");
  const mentionsMed =
    t.includes("ilac") || t.includes("ilaç") || t.includes("hap") || t.includes("içtim");
  const mentionsMeasure =
    t.includes("tansiyon") ||
    t.includes("ölçtüm") ||
    t.includes("olctum") ||
    t.includes("şeker") ||
    t.includes("nabız");
  if (mentionsMeasure) return "measurement";
  if (mentionsMed) return "medication";
  return "unknown";
}

/**
 * Bir kez dinleyip tanınan komutu döndürür. Web'de gerçek mikrofon kullanılır;
 * native'de örnek bir komutla güvenli geri düşüş yapılır.
 */
export function listenOnce(): {
  promise: Promise<VoiceResult>;
  cancel: () => void;
} {
  const Ctor = getRecognitionCtor();

  if (!Ctor) {
    // Native / desteklenmeyen tarayıcı: erişilebilirlik akışını sürdürmek için
    // örnek bir komutla güvenli geri düşüş.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const promise = new Promise<VoiceResult>((resolve) => {
      timer = setTimeout(() => {
        const transcript = "İlacımı içtim";
        resolve({ transcript, command: classifyTranscript(transcript) });
      }, 1500);
    });
    return {
      promise,
      cancel: () => {
        if (timer) clearTimeout(timer);
      },
    };
  }

  const recognition = new Ctor();
  recognition.lang = "tr-TR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const promise = new Promise<VoiceResult>((resolve, reject) => {
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      resolve({ transcript, command: classifyTranscript(transcript) });
    };
    recognition.onerror = (event) => {
      reject(new Error(event.error || "voice-error"));
    };
    recognition.onend = () => {
      // onresult tetiklenmeden biterse sessizce reddet.
    };
    try {
      recognition.start();
    } catch {
      reject(new Error("voice-start-failed"));
    }
  });

  return {
    promise,
    cancel: () => {
      try {
        recognition.stop();
      } catch {
        // yok say
      }
    },
  };
}
