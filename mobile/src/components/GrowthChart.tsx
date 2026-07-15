import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

import type { GrowthReferencePoint } from "../data/types";

interface GrowthChartProps {
  /** P3/P50/P97 referans bantları (yaş ay sırasına göre). */
  reference: GrowthReferencePoint[];
  /** Bebeğin ölçümleri: [ay, değer]. */
  points: { ageMonths: number; value: number }[];
  unit: string;
  /** Grafik yüksekliği (px). */
  height?: number;
}

const PAD_LEFT = 34;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;

/**
 * Persentil gelişim grafiği: P3-P97 arası gölgeli bant + P50 medyan çizgisi
 * üzerine bebeğin ölçüm noktaları çizilir. Gözü yormayan, temiz SVG.
 */
export default function GrowthChart({
  reference,
  points,
  unit,
  height = 180,
}: GrowthChartProps) {
  const width = 300;

  const { bandPath, medianPoints, childPoints, yTicks, maxAge } = useMemo(() => {
    const maxAgeVal = reference.length
      ? reference[reference.length - 1].ageMonths
      : 24;
    const allValues = [
      ...reference.map((r) => r.p3),
      ...reference.map((r) => r.p97),
      ...points.map((p) => p.value),
    ];
    const minY = Math.min(...allValues);
    const maxY = Math.max(...allValues);
    const range = maxY - minY || 1;
    const padY = range * 0.08;
    const lo = minY - padY;
    const hi = maxY + padY;

    const plotW = width - PAD_LEFT - PAD_RIGHT;
    const plotH = height - PAD_TOP - PAD_BOTTOM;

    const sx = (age: number) => PAD_LEFT + (age / maxAgeVal) * plotW;
    const sy = (value: number) =>
      PAD_TOP + (1 - (value - lo) / (hi - lo)) * plotH;

    const p97 = reference.map((r) => `${sx(r.ageMonths)},${sy(r.p97)}`);
    const p3rev = [...reference]
      .reverse()
      .map((r) => `${sx(r.ageMonths)},${sy(r.p3)}`);
    const band = `M${p97.join(" L")} L${p3rev.join(" L")} Z`;

    const median = reference
      .map((r) => `${sx(r.ageMonths)},${sy(r.p50)}`)
      .join(" ");

    const child = points
      .slice()
      .sort((a, b) => a.ageMonths - b.ageMonths)
      .map((p) => ({ x: sx(p.ageMonths), y: sy(p.value) }));

    const ticks = [lo, (lo + hi) / 2, hi].map((v) => ({
      y: sy(v),
      label: v.toFixed(v < 20 ? 1 : 0),
    }));

    return {
      bandPath: band,
      medianPoints: median,
      childPoints: child,
      yTicks: ticks,
      maxAge: maxAgeVal,
    };
  }, [reference, points, height]);

  const childPolyline = childPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const xTicks = [0, 6, 12, 18, maxAge];

  return (
    <View>
      <Svg width={width} height={height}>
        {/* P3-P97 gölgeli bant */}
        <Path d={bandPath} fill="#d1fae5" opacity={0.7} />
        {/* P50 medyan çizgisi */}
        <Polyline
          points={medianPoints}
          fill="none"
          stroke="#006644"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        {/* Bebeğin ölçüm çizgisi */}
        {childPoints.length >= 2 ? (
          <Polyline
            points={childPolyline}
            fill="none"
            stroke="#0284c7"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        ) : null}
        {childPoints.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#0284c7" />
        ))}
        {/* Y ekseni etiketleri */}
        {yTicks.map((t, i) => (
          <Line
            key={i}
            x1={PAD_LEFT}
            y1={t.y}
            x2={width - PAD_RIGHT}
            y2={t.y}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}
      </Svg>
      {/* Eksen açıklamaları */}
      <View className="mt-1 flex-row justify-between px-1">
        {xTicks.map((m) => (
          <Text key={m} className="text-[9px] text-muted">
            {m} ay
          </Text>
        ))}
      </View>
      <View className="mt-2 flex-row items-center justify-center">
        <View className="mr-3 flex-row items-center">
          <View className="mr-1 h-2 w-4 rounded-sm bg-brand-light" />
          <Text className="text-[9px] text-muted">P3–P97 aralığı</Text>
        </View>
        <View className="mr-3 flex-row items-center">
          <View className="mr-1 h-0.5 w-4 bg-brand-dark" />
          <Text className="text-[9px] text-muted">P50 medyan</Text>
        </View>
        <View className="flex-row items-center">
          <View className="mr-1 h-2 w-2 rounded-full bg-blue" />
          <Text className="text-[9px] text-muted">Bebeğiniz ({unit})</Text>
        </View>
      </View>
    </View>
  );
}
