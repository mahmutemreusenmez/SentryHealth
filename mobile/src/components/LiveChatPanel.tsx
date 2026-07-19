import { MessageCircle, Send } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";

import { PressableScale } from "./ui";
import type { ChatLine } from "../data/types";
import { chatChannel, makeChatLine } from "../services/chatChannel";
import { formatClock } from "../utils/format";

/**
 * Hasta ile sağlık personeli arasındaki canlı yazışma penceresi.
 *
 * `roomId` ile eşlenen görüşme kanalına bağlanır; `from` gönderenin rolünü
 * belirtir ("staff" = personel, "patient" = hasta). Karşı taraftan gelen
 * satırlar anlık olarak listeye düşer.
 */
export default function LiveChatPanel({
  roomId,
  from,
  title,
  placeholder = "Bir mesaj yazın…",
}: {
  roomId: string;
  from: ChatLine["from"];
  title: string;
  placeholder?: string;
}) {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatLine>>(null);

  useEffect(() => {
    const unsubscribe = chatChannel.subscribe(roomId, (line) => {
      setLines((prev) =>
        prev.some((l) => l.id === line.id) ? prev : [...prev, line],
      );
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
    });
    return unsubscribe;
  }, [roomId]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const line = makeChatLine(roomId, from, text);
    setLines((prev) => [...prev, line]);
    chatChannel.publish(line);
    setDraft("");
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
  };

  return (
    <View className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
      <View className="flex-row items-center border-b border-line bg-brand-light px-4 py-3">
        <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-full bg-brand">
          <MessageCircle size={16} color="#ffffff" />
        </View>
        <Text className="text-sm font-bold text-brand-dark">{title}</Text>
      </View>

      <View className="p-4">
      <View
        className="mb-3 rounded-2xl border border-line bg-surface p-3"
        style={{ height: 220 }}
      >
        {lines.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="px-4 text-center text-[11px] text-muted">
              Görüşmeye başlamak için bir mesaj yazın.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={lines}
            keyExtractor={(l) => l.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const mine = item.from === from;
              return (
                <View
                  className={`mb-2 max-w-[82%] ${mine ? "self-end" : "self-start"}`}
                >
                  <View
                    className={`rounded-2xl px-3 py-2 ${
                      mine
                        ? "rounded-br-sm bg-brand"
                        : "rounded-bl-sm border border-line bg-white"
                    }`}
                  >
                    <Text className={mine ? "text-white" : "text-ink"}>
                      {item.text}
                    </Text>
                  </View>
                  <Text
                    className={`mt-0.5 text-[10px] text-muted ${
                      mine ? "text-right" : "text-left"
                    }`}
                  >
                    {formatClock(item.at)}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

      <View className="flex-row items-center">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          className="mr-2 flex-1 rounded-full bg-surface px-4 py-2 text-ink"
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <PressableScale
          onPress={send}
          accessibilityRole="button"
          accessibilityLabel="Mesaj gönder"
          className="h-11 w-11 items-center justify-center rounded-full bg-brand"
        >
          <Send size={18} color="#ffffff" />
        </PressableScale>
      </View>
      </View>
    </View>
  );
}
