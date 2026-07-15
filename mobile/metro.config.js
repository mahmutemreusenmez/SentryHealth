const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Expo Web'de @babel/runtime yardımcılarının ESM/CJS interop hatasını
// (_interopRequireDefault is not a function) önlemek için package "exports"
// çözümlemesini kapatıyoruz.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
