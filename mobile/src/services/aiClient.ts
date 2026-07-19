import { Platform } from "react-native";

import type { PatientProfile, VitalEntry } from "../data/types";
import { generateAssistantReply } from "./assistantService";

/**
 * Gerçek LLM (OpenAI/Claude uyumlu) API istemcisi.
 *
 * - Hastanın mesajı + güvenli hafızadan gelen profil (yaş, kronik hastalık) ve
 *   son vitaller birleştirilerek bir istek gövdesi (payload) kurulur.
 * - Yanıt akıcı biçimde (streaming / typist efekti) ekrana yazdırılır.
 * - **Offline-First:** İnternet yoksa veya API anahtarı tanımlı değilse, yerel
 *   şifreli şablonlardan (kural tabanlı asistan) acil durum önerileri gösterilir.
 *
 * API anahtarı `EXPO_PUBLIC_AI_API_KEY` ortam değişkeninden okunur; tanımlı
 * değilse istemci otomatik olarak çevrimdışı moda düşer.
 */

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export type AssistantSource = "api" | "offline";

export interface AssistantResult {
  text: string;
  source: AssistantSource;
}

export interface StreamHandlers {
  /** Her yeni metin parçası geldikçe çağrılır (akıcı yazım için). */
  onToken: (chunk: string) => void;
  /** İsteği iptal etmek için (ör. ekran kapanınca). */
  signal?: AbortSignal;
}

/** Ortam değişkenlerinden LLM yapılandırmasını okur; anahtar yoksa null. */
export function getAiConfig(): AiConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
  if (!apiKey) return null;
  return {
    baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey,
    model: process.env.EXPO_PUBLIC_AI_MODEL ?? "gpt-4o-mini",
  };
}

/** Basit çevrimiçi kontrolü: web'de navigator.onLine, native'de iyimser. */
export function isOnline(): boolean {
  if (Platform.OS === "web" && typeof navigator !== "undefined") {
    return navigator.onLine;
  }
  return true;
}

function buildSystemPrompt(
  profile: PatientProfile,
  vitals: VitalEntry | null,
): string {
  const conditions =
    profile.chronicConditions.length > 0
      ? profile.chronicConditions.join(", ")
      : "bilinen kronik hastalık yok";
  const vitalsLine = vitals
    ? `Son ölçülen vitaller — Tansiyon: ${vitals.systolic}/${vitals.diastolic} mmHg, Nabız: ${vitals.pulse}/dk, Kan şekeri: ${vitals.glucose} mg/dL.`
    : "Henüz kayıtlı vital ölçümü yok.";
  return [
    "Sen Türkçe konuşan bir klinik sağlık asistanısın.",
    "Kronik hastalar ve yaşlı bireyler için proaktif, tıbbi dilde ama anlaşılır tavsiyeler verirsin.",
    "Teşhis koymaz, hekimin yerini almazsın; şiddetli belirtilerde 112'ye yönlendirirsin.",
    `Hasta: ${profile.fullName}, ${profile.age} yaşında. Kronik durum: ${conditions}.`,
    vitalsLine,
  ].join(" ");
}

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildMessages(
  userText: string,
  profile: PatientProfile,
  vitals: VitalEntry | null,
): ChatCompletionMessage[] {
  return [
    { role: "system", content: buildSystemPrompt(profile, vitals) },
    { role: "user", content: userText },
  ];
}

const OFFLINE_PREFIX = "[Çevrimdışı Mod] ";

/** Çevrimdışı/anahtarsız durumda yerel şablonla akıcı (typist) yanıt üretir. */
async function offlineReply(
  userText: string,
  profile: PatientProfile,
  handlers: StreamHandlers,
): Promise<AssistantResult> {
  const full = OFFLINE_PREFIX + generateAssistantReply(userText, profile);
  const words = full.split(" ");
  for (let i = 0; i < words.length; i += 1) {
    if (handlers.signal?.aborted) break;
    handlers.onToken(i === 0 ? words[i] : ` ${words[i]}`);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 22));
  }
  return { text: full, source: "offline" };
}

/** OpenAI uyumlu SSE akışını okuyup token'ları iletir (web). */
async function streamFromApi(
  config: AiConfig,
  messages: ChatCompletionMessage[],
  handlers: StreamHandlers,
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      temperature: 0.4,
    }),
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`AI API hatası: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          full += token;
          handlers.onToken(token);
        }
      } catch {
        // Yarım/parçalı SSE satırı; sonraki okumada tamamlanır.
      }
    }
  }
  return full;
}

/** Non-streaming çağrı (native fetch akış okumayı desteklemediğinde). */
async function requestFromApi(
  config: AiConfig,
  messages: ChatCompletionMessage[],
  handlers: StreamHandlers,
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.4,
    }),
    signal: handlers.signal,
  });
  if (!response.ok) throw new Error(`AI API hatası: ${response.status}`);
  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const full = json.choices?.[0]?.message?.content ?? "";
  // Non-streaming yanıtı da typist efektiyle akıt.
  const words = full.split(" ");
  for (let i = 0; i < words.length; i += 1) {
    if (handlers.signal?.aborted) break;
    handlers.onToken(i === 0 ? words[i] : ` ${words[i]}`);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return full;
}

/**
 * Asistan yanıtını üretir. Anahtar + internet varsa gerçek LLM API'sinden akış
 * alır; aksi halde çevrimdışı şablona düşer. Her iki durumda da `onToken` ile
 * akıcı yazım sağlanır.
 */
export async function streamAssistantReply(
  userText: string,
  profile: PatientProfile,
  vitals: VitalEntry | null,
  handlers: StreamHandlers,
): Promise<AssistantResult> {
  const config = getAiConfig();
  if (!config || !isOnline()) {
    return offlineReply(userText, profile, handlers);
  }
  try {
    const messages = buildMessages(userText, profile, vitals);
    const text =
      Platform.OS === "web"
        ? await streamFromApi(config, messages, handlers)
        : await requestFromApi(config, messages, handlers);
    if (!text.trim()) return offlineReply(userText, profile, handlers);
    return { text, source: "api" };
  } catch {
    // Ağ/servis hatasında çevrimdışı acil öneriye düş.
    return offlineReply(userText, profile, handlers);
  }
}
