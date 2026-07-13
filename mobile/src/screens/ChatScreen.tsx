import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePatient } from "../context/PatientContext";
import type { ChatMessage } from "../data/types";
import {
  createMessage,
  generateAssistantReply,
} from "../services/assistantService";
import { formatClock } from "../utils/format";

const QUICK_PROMPTS = [
  "Başım dönüyor, ne yapmalıyım?",
  "İlacımı almayı unuttum",
  "Randevularım neler?",
];

export default function ChatScreen() {
  const { profile } = usePatient();
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      `Merhaba ${profile.fullName.split(" ")[0]}, ben SentryCompanion. ` +
        "Sağlığınızla ilgili sorularınızı sesli veya yazılı sorabilirsiniz.",
    ),
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = (text: string, viaVoice = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg = createMessage("user", trimmed, viaVoice);
    const reply = createMessage(
      "assistant",
      generateAssistantReply(trimmed, profile),
    );
    setMessages((prev) => [...prev, userMsg, reply]);
    setInput("");
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
  };

  // Sesli giriş simülasyonu: gerçek dağıtımda expo-speech / STT bağlanacak.
  const toggleVoice = () => {
    if (listening) {
      setListening(false);
      return;
    }
    setListening(true);
    setTimeout(() => {
      setListening(false);
      send("Başım dönüyor, ne yapmalıyım?", true);
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      {/* Başlık */}
      <View className="flex-row items-center border-b border-gray-100 bg-white px-4 py-3">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand">
          <Ionicons name="chatbubbles" size={20} color="#fff" />
        </View>
        <View>
          <Text className="text-base font-bold text-ink">
            SentryCompanion AI
          </Text>
          <Text className="text-[11px] text-success">● Çevrimiçi</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <Bubble message={item} />}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Hızlı öneriler */}
        <View className="flex-row flex-wrap px-4">
          {QUICK_PROMPTS.map((p) => (
            <Pressable
              key={p}
              onPress={() => send(p)}
              className="mb-2 mr-2 rounded-full border border-brand bg-white px-3 py-1"
            >
              <Text className="text-[11px] text-brand-dark">{p}</Text>
            </Pressable>
          ))}
        </View>

        {/* Giriş çubuğu */}
        <View className="flex-row items-center border-t border-gray-100 bg-white px-3 py-2">
          <Pressable
            onPress={toggleVoice}
            className={`mr-2 h-11 w-11 items-center justify-center rounded-full ${
              listening ? "bg-danger" : "bg-brand-light"
            }`}
          >
            <Ionicons
              name={listening ? "stop" : "mic"}
              size={20}
              color={listening ? "#fff" : "#0a7c86"}
            />
          </Pressable>
          <TextInput
            value={listening ? "Dinleniyor..." : input}
            editable={!listening}
            onChangeText={setInput}
            placeholder="Bir mesaj yazın..."
            className="mr-2 flex-1 rounded-full bg-surface px-4 py-2 text-ink"
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => send(input)}
            className="h-11 w-11 items-center justify-center rounded-full bg-brand"
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <View
      className={`mb-3 max-w-[80%] ${isUser ? "self-end" : "self-start"}`}
    >
      <View
        className={`rounded-2xl px-4 py-2 ${
          isUser
            ? "rounded-br-sm bg-brand"
            : "rounded-bl-sm border border-gray-100 bg-white"
        }`}
      >
        <Text className={isUser ? "text-white" : "text-ink"}>
          {message.text}
        </Text>
      </View>
      <View
        className={`mt-1 flex-row items-center ${
          isUser ? "justify-end" : "justify-start"
        }`}
      >
        {message.viaVoice ? (
          <Ionicons
            name="mic"
            size={10}
            color="#6b7280"
            style={{ marginRight: 3 }}
          />
        ) : null}
        <Text className="text-[10px] text-muted">
          {formatClock(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}
