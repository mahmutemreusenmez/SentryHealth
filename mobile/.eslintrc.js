module.exports = {
  extends: "expo",
  ignorePatterns: ["/dist/*", "/node_modules/*"],
  overrides: [
    {
      files: ["*.config.js", "babel.config.js", "metro.config.js", ".eslintrc.js"],
      env: { node: true },
    },
  ],
};
