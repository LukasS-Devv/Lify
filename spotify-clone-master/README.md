# 🎶 Spotify Clone React Native App

Welcome to the **Spotify Clone React Native App**! This project is a feature-rich, cross-platform Spotify clone designed to provide an experience similar to the official Spotify app. With seamless navigation, music streaming, and user library management, the app offers music lovers a familiar and fully functional way to explore songs, artists, and playlists.

https://github.com/user-attachments/assets/0a1f764f-d0ce-465b-973d-4e58f1cc02db

## 📖 About

This clone is powered by React Native and Expo Go, leveraging the Spotify API to deliver real-time music data, playback features, and account-specific interactions. Whether browsing for new music, creating playlists, or diving into curated collections, this app mirrors Spotify's functionality in a mobile-friendly environment.

![Logo](./docs/logo.png 'Logo')

## ✨ Features

- **Stream Music**: Access and stream music directly via Spotify API.
- **Browse & Search**: Discover songs, albums, artists, and curated playlists with Spotify’s database.
- **User Library Management**: Access and manage your liked songs, playlists, and library.
- **Intuitive Spotify-Like UI**: Designed to replicate Spotify’s clean, modern user interface.
- **Real-Time Sync with Spotify**: Connect with Spotify's API for up-to-date song data and user-specific information.
- **Cross-platform Compatibility**: Works on both iOS and Android with Expo Go.

# Cloning the project

Clone the project simply by running:

```bash
git clone https://github.com/dhunanyan/spotify-clone.git
```

OR

```bash
git clone git@github.com:dhunanyan/spotify-clone.git
```

# How to install project dependencies?

Go to your terminal and run the following commands below in yhe root of your project:

```bash
cd ./spotify-clone
nvm use
yarn install
```

# How to run project?

To run project for IOS Device please run one of the following commands:

```bash
# if you have Apple Developer membership
yarn dev:ios

# if you DON'T have Apple Developer membership
yarn dev
```

To run project for Android Device please run the following command:

```bash
yarn dev:android
```

# How to open the app on real device

If you will be using a _real device_ in order to run the app, you should go to `App Store (IOS)` / `Google Play (Android)` and install `Expo Go` application.

After installing the app you should open up the camera of your phone and scan the QR code which will be generated in the terminal after your finish the previous step

# How to open the app on Native Simulator?

if you will be using Native Simulator, please download you simulator, setup the device you will be using.

Later on go to the terminal in which you run the app (the one with the QR code) and press:

- `"a"` - for Android Simulator
- `"i"` - for IOS Simulator
- `"w"` - to open up project in Web Browser (However unfortunately, there is no support for Web Browser :disappointed:)
