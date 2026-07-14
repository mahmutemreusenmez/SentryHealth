/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // e-Nabız kurumsal paleti — yalnızca sağlık yeşili, bakanlık mavisi,
        // temiz beyaz ve gri tonları.
        brand: {
          DEFAULT: "#10b981", // e-Nabız yeşili
          dark: "#059669",
          light: "#d1fae5",
        },
        blue: {
          DEFAULT: "#0284c7", // Sağlık Bakanlığı mavisi
          dark: "#0369a1",
          light: "#e0f2fe",
        },
        success: "#10b981",
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
