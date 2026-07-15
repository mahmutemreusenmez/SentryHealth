/**
 * e-Nabız / T.C. Sağlık Bakanlığı kurumsal renk paleti (tek kaynak).
 *
 * NativeWind sınıf renkleriyle (tailwind.config.js) birebir eşleşir; SVG ve
 * ikon gibi doğrudan `color` alan bileşenlerde bu sabitler kullanılır.
 */
export const COLORS = {
  /** e-Nabız kurumsal yeşili. */
  brand: "#00875A",
  brandDark: "#006644",
  brandLight: "#d1fae5",
  /** Sağlık Bakanlığı mavisi. */
  blue: "#0284c7",
  blueDark: "#0369a1",
  blueLight: "#e0f2fe",
  /** e-Devlet Kapısı kırmızısı (uyarı/acil). */
  edevlet: "#c20c18",
  danger: "#dc2626",
  amber: "#d97706",
  white: "#ffffff",
  ink: "#1f2937",
  muted: "#6b7280",
  line: "#e5e7eb",
  surface: "#f8fafc",
} as const;

/** MEWS klinik risk bandı renkleri (Yeşil / Sarı / Kırmızı). */
export const MEWS_BAND_COLOR = {
  green: COLORS.brand,
  yellow: COLORS.amber,
  red: COLORS.edevlet,
} as const;

/**
 * Yüksek kontrast (WCAG 2.1) erişilebilirlik teması için yüzey renkleri.
 * Normal modda e-Nabız açık teması, yüksek kontrast modunda koyu/net tema.
 */
export interface SurfaceTheme {
  screen: string;
  card: string;
  border: string;
  ink: string;
  muted: string;
}

export const LIGHT_SURFACE: SurfaceTheme = {
  screen: COLORS.surface,
  card: COLORS.white,
  border: COLORS.line,
  ink: COLORS.ink,
  muted: COLORS.muted,
};

export const HIGH_CONTRAST_SURFACE: SurfaceTheme = {
  screen: "#000000",
  card: "#111827",
  border: "#4b5563",
  ink: "#ffffff",
  muted: "#d1d5db",
};
