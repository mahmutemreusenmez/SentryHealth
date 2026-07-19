/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // e-Nabız kurumsal paleti — baskın kurumsal kırmızı, bakanlık mavisi,
        // temiz beyaz ve gri tonları.
        brand: {
          DEFAULT: "#E11D48", // e-Nabız kurumsal kırmızısı
          dark: "#BE123C",
          light: "#ffe4e6",
        },
        blue: {
          DEFAULT: "#0284c7", // Sağlık Bakanlığı mavisi
          dark: "#0369a1",
          light: "#e0f2fe",
        },
        // e-Devlet Kapısı kurumsal kırmızı-gece mavisi tonu
        edevlet: {
          DEFAULT: "#c20c18",
          dark: "#1f2a44",
        },
        success: {
          DEFAULT: "#16a34a",
          dark: "#15803d",
          light: "#dcfce7",
        },
        danger: "#dc2626",
        ink: "#1f2937",
        muted: "#6b7280",
        line: "#e5e7eb",
        surface: "#f8fafc",
      },
    },
  },
  plugins: [],
};
