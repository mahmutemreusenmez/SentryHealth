import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";

/**
 * Yükleme/iskelet (skeleton) parçası — soluk gri bir blok üzerinde ileri-geri
 * hareket eden parıltı (shimmer) animasyonu. SentryLens tahlil analizi
 * beklenirken kullanılır.
 */
export function ShimmerBlock({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius: radius,
          backgroundColor: "#e5e7eb",
          opacity,
        },
        style,
      ]}
    />
  );
}

/** SentryLens analiz beklerken gösterilen iskelet kart. */
export function LabSkeleton() {
  return (
    <View className="rounded-2xl border border-line bg-white p-4">
      <ShimmerBlock width={160} height={18} />
      <View style={{ height: 12 }} />
      <ShimmerBlock width="100%" height={12} />
      <View style={{ height: 8 }} />
      <ShimmerBlock width="90%" height={12} />
      <View style={{ height: 16 }} />
      <ShimmerBlock width="100%" height={54} radius={12} />
      <View style={{ height: 10 }} />
      <ShimmerBlock width="100%" height={54} radius={12} />
    </View>
  );
}
