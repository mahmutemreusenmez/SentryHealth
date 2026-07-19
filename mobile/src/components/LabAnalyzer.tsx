import * as DocumentPicker from "expo-document-picker";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sparkles,
  UploadCloud,
  Volume2,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { LabAnalysis, LabFinding } from "../data/types";
import { runLabAnalysis, SAMPLE_LAB_TEXT } from "../services/labAnalyzer";
import { speak } from "../services/speechService";
import { LabSkeleton } from "./Shimmer";
import { Card, SectionHeader } from "./ui";

/**
 * SentryLens — PDF/Görüntü tahlil raporu yükleyici + AI analiz sonucu.
 * `expo-document-picker` ile dosya seçilir, analiz sırasında iskelet (shimmer)
 * gösterilir, referans dışı değerler kırmızı kartlarla sade dilde özetlenir.
 */
export default function LabAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<LabAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickAndAnalyze = useCallback(async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const fileName = result.assets[0].name || "tahlil.pdf";

      setAnalysis(null);
      setLoading(true);
      // Gerçek OCR yerine örnek tahlil metni analiz edilir (demo veri).
      const next = await runLabAnalysis(fileName, SAMPLE_LAB_TEXT);
      setAnalysis(next);
    } catch {
      setError("Dosya seçilemedi veya analiz edilemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Card className="mb-5">
      <SectionHeader
        title="SentryLens · Tahlil Analizi"
        subtitle="PDF/görüntü tahlil raporunuzu yapay zeka ile sadeleştirin"
        icon={Sparkles}
      />

      <Pressable
        onPress={pickAndAnalyze}
        disabled={loading}
        className={`flex-row items-center justify-center rounded-xl py-3 ${
          loading ? "bg-blue/60" : "bg-blue"
        }`}
      >
        <UploadCloud size={16} color="#ffffff" />
        <Text className="ml-2 text-sm font-bold text-white">
          {loading ? "Analiz Ediliyor..." : "Tahlil Yükle"}
        </Text>
      </Pressable>

      {error ? (
        <Text className="mt-2 text-[11px] font-semibold text-danger">
          {error}
        </Text>
      ) : null}

      {loading ? (
        <View className="mt-4">
          <LabSkeleton />
        </View>
      ) : null}

      {analysis && !loading ? (
        <AnalysisResult analysis={analysis} />
      ) : null}
    </Card>
  );
}

function AnalysisResult({ analysis }: { analysis: LabAnalysis }) {
  const speakSummary = () => {
    const abnormal = analysis.findings.filter((f) => f.status !== "normal");
    const detail = abnormal
      .map((f) => `${f.name}: ${f.plainSummary}`)
      .join(" ");
    speak(`${analysis.overallSummary} ${detail}`);
  };

  return (
    <View className="mt-4">
      <View className="mb-3 flex-row items-center">
        <FileText size={14} color="#6b7280" />
        <Text className="ml-1 flex-1 text-[11px] font-semibold text-muted">
          {analysis.fileName}
        </Text>
        <Pressable
          onPress={speakSummary}
          accessibilityRole="button"
          accessibilityLabel="Analiz sonucunu sesli oku"
          className="h-8 w-8 items-center justify-center rounded-full bg-brand-light"
        >
          <Volume2 size={15} color="#BE123C" />
        </Pressable>
      </View>

      <View
        className={`mb-3 rounded-2xl p-3 ${
          analysis.abnormalCount > 0 ? "bg-blue-light" : "bg-brand-light"
        }`}
      >
        <Text className="text-xs font-bold text-ink">AI Analiz Sonucu</Text>
        <Text className="mt-1 text-[12px] leading-5 text-ink">
          {analysis.overallSummary}
        </Text>
      </View>

      {analysis.findings.map((finding) => (
        <FindingCard key={finding.name} finding={finding} />
      ))}
    </View>
  );
}

function FindingCard({ finding }: { finding: LabFinding }) {
  const abnormal = finding.status !== "normal";
  const statusLabel =
    finding.status === "low"
      ? "Düşük"
      : finding.status === "high"
        ? "Yüksek"
        : "Normal";

  return (
    <View
      className={`mb-2 rounded-2xl border p-3 ${
        abnormal ? "border-danger bg-danger/5" : "border-line bg-white"
      }`}
    >
      <View className="flex-row items-center">
        {abnormal ? (
          <AlertTriangle size={15} color="#dc2626" />
        ) : (
          <CheckCircle2 size={15} color="#15803d" />
        )}
        <Text className="ml-2 flex-1 text-sm font-bold text-ink">
          {finding.name}
        </Text>
        <View
          className={`rounded-full px-2 py-0.5 ${
            abnormal ? "bg-danger" : "bg-brand"
          }`}
        >
          <Text className="text-[10px] font-bold text-white">
            {finding.value} {finding.unit} · {statusLabel}
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-[11px] text-muted">
        Referans: {finding.refLow}–{finding.refHigh} {finding.unit}
      </Text>
      <Text className="mt-1 text-[12px] leading-5 text-ink">
        {finding.plainSummary}
      </Text>
    </View>
  );
}
