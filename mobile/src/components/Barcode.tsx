import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

/**
 * Sevk barkodu — verilen koddan deterministik (aynı kod → aynı desen) üretilen
 * görsel bir barkod. Gerçek bir Code128 kodlayıcısı yerine, koddaki karakter
 * kodlarından türetilen değişken genişlikli çubuklarla temsili bir barkod
 * çizilir. Barkodun altında insan-okur kod metni gösterilir.
 */
export default function Barcode({
  value,
  width = 240,
  height = 68,
  color = "#111827",
}: {
  value: string;
  width?: number;
  height?: number;
  color?: string;
}) {
  const bars = useMemo(() => {
    // Koddan tekrarlanabilir bir bit dizisi türet.
    const bits: number[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      for (let b = 0; b < 8; b += 1) {
        bits.push((code >> b) & 1 ? 2 : 1); // bar genişliği 1 veya 2 birim
      }
    }
    // İki uçta sabit sınır çubukları
    bits.unshift(1, 1);
    bits.push(1, 1);

    const totalUnits = bits.reduce((a, b) => a + b, 0);
    const unit = width / totalUnits;
    const rects: { x: number; w: number }[] = [];
    let x = 0;
    bits.forEach((w, index) => {
      if (index % 2 === 0) {
        rects.push({ x, w: w * unit });
      }
      x += w * unit;
    });
    return rects;
  }, [value, width]);

  const barHeight = height - 16;

  return (
    <View style={{ width, alignItems: "center" }}>
      <Svg width={width} height={barHeight}>
        {bars.map((bar, index) => (
          <Rect
            key={index}
            x={bar.x}
            y={0}
            width={Math.max(0.5, bar.w)}
            height={barHeight}
            fill={color}
          />
        ))}
      </Svg>
      <Text
        style={{
          marginTop: 4,
          fontSize: 12,
          letterSpacing: 3,
          fontWeight: "700",
          color,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
