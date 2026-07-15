import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

/** Basit, gözü yormayan SVG çizgi grafiği (canlı vital trendi için). */
export default function Sparkline({
  data,
  color = "#00875A",
  width = 120,
  height = 40,
  strokeWidth = 2,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}) {
  const { path, lastPoint } = useMemo(() => {
    if (data.length < 2) {
      return { path: "", lastPoint: null as { x: number; y: number } | null };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * (height - strokeWidth * 2) - strokeWidth;
      return { x, y };
    });
    const d = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    return { path: d, lastPoint: points[points.length - 1] };
  }, [data, width, height, strokeWidth]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {path ? (
          <Path
            d={path}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {lastPoint ? (
          <Circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={color} />
        ) : null}
      </Svg>
    </View>
  );
}
