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
        // e-Nabız kurumsal paleti
        brand: {
          DEFAULT: "#0a7c86",
          dark: "#075e66",
          light: "#e6f4f5",
        },
        accent: "#f39200",
        danger: "#d64545",
        success: "#2e9e5b",
        ink: "#1f2933",
        muted: "#6b7280",
        surface: "#f5f7f8",
      },
    },
  },
  plugins: [],
};
