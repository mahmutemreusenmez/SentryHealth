import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { COLORS } from "../theme/colors";

/**
 * Kütüphane bağımlılığı yaratmayan, saf SVG tabanlı sağlık trend grafiği.
 * Anlık tansiyon/şeker gibi longitudinal metriklerin gözü yormayan minimal
 * çizelgesi. Birden çok seri (ör. sistolik + diyastolik) destekler.
 */

export interface TrendSeries {
  label: string;
  color: string;
  values: number[];
}

interface Point {
  x: number;
  y: number;
}

const WIDTH = 300;
const HEIGHT = 140;
const PAD_X = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

function buildPath(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

export default function TrendChart({
  series,
  labels,
  unit,
  textColor = COLORS.muted,
  gridColor = COLORS.line,
}: {
  series: TrendSeries[];
  labels: string[];
  unit?: string;
  textColor?: string;
  gridColor?: string;
}) {
  const { min, max } = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    if (all.length === 0) return { min: 0, max: 1 };
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.15 || 5;
    return { min: lo - pad, max: hi + pad };
  }, [series]);

  const count = Math.max(...series.map((s) => s.values.length), 0);
  const range = max - min || 1;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotW = WIDTH - PAD_X * 2;

  const toPoints = (values: number[]): Point[] =>
    values.map((value, index) => ({
      x: PAD_X + (count <= 1 ? plotW / 2 : (index / (count - 1)) * plotW),
      y: PAD_TOP + plotH - ((value - min) / range) * plotH,
    }));

  const gridYs = [0, 0.5, 1].map((f) => PAD_TOP + plotH * f);

  return (
    <View>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {gridYs.map((y, i) => (
          <Line
            key={i}
            x1={PAD_X}
            y1={y}
            x2={WIDTH - PAD_X}
            y2={y}
            stroke={gridColor}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}

        {series.map((s) => {
          const points = toPoints(s.values);
          if (points.length === 0) return null;
          return (
            <React.Fragment key={s.label}>
              <Path
                d={buildPath(points)}
                stroke={s.color}
                strokeWidth={2.5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} />
              ))}
            </React.Fragment>
          );
        })}

        {labels.map((label, index) => {
          const x =
            PAD_X + (count <= 1 ? plotW / 2 : (index / (count - 1)) * plotW);
          return (
            <SvgText
              key={label + index}
              x={x}
              y={HEIGHT - 6}
              fill={textColor}
              fontSize={9}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Seri açıklaması (legend) */}
      <View className="mt-1 flex-row flex-wrap items-center justify-center">
        {series.map((s) => (
          <View key={s.label} className="mx-2 flex-row items-center">
            <View
              className="mr-1 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <Text className="text-[10px]" style={{ color: textColor }}>
              {s.label}
            </Text>
          </View>
        ))}
        {unit ? (
          <Text className="ml-1 text-[10px]" style={{ color: textColor }}>
            ({unit})
          </Text>
        ) : null}
      </View>
    </View>
  );
}
