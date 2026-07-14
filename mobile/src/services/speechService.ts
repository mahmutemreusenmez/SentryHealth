import * as Speech from "expo-speech";

/**
 * Yaşlı ve görme engelli dostu sesli asistan (Text-to-Speech) katmanı.
 *
 * `expo-speech` üzerinden Türkçe (tr-TR) seslendirme sağlar. Web'de tarayıcının
 * `SpeechSynthesis` API'si, native'de cihazın TTS motoru kullanılır. Aynı anda
 * yalnızca bir okuma çalışsın diye yeni bir istek gelince önceki durdurulur.
 */
const SPEECH_OPTIONS: Speech.SpeechOptions = {
  language: "tr-TR",
  rate: 0.95,
  pitch: 1.0,
};

/** Verilen metni Türkçe olarak sesli okur (öncekini durdurarak). */
export function speak(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  Speech.stop();
  Speech.speak(trimmed, SPEECH_OPTIONS);
}

/** Süren tüm seslendirmeyi durdurur. */
export function stopSpeaking(): void {
  Speech.stop();
}
