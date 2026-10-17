module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
    ignore: [
      /node_modules\/(?!@shopify\/react-native-skia|react-native|@react-native|expo|@expo|@expo-module|@react-navigation)/,
    ],
  };
};
