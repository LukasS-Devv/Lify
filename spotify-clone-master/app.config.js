module.exports = {
  expo: {
    name: 'spotify-clone',
    slug: 'spotify-clone',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/logo.png',
    scheme: 'acme',
    plugins: ['expo-router'],
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    web: {
      bundler: 'metro',
      favicon: './assets/images/logo.png',
    },
    experiments: {
      typedRoutes: true,
    },
    extra: {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      tokenKey: process.env.TOKEN_KEY,
      refreshTokenKey: process.env.REFRESH_TOKEN_KEY,
      expirationKey: process.env.EXPIRATION_KEY,
      authorizationEndpoint: process.env.AUTHORIZATION_ENDPOINT,
      tokenEndpoint: process.env.TOKEN_ENDPOINT,
      router: {
        origin: false,
      },
      eas: {
        projectId: '33b0281a-b127-47fe-ab16-e94caf272493',
      },
    },
  },
};
