import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const refreshAccessToken = async (refreshToken: string) => {
  if (!Constants.expoConfig || !Constants.expoConfig.extra) {
    return null;
  }

  const { tokenEndpoint, clientID, clientSecret } = Constants.expoConfig.extra;

  try {
    const response = await axios.post(
      tokenEndpoint,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientID as string,
        client_secret: clientSecret as string,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
};

export const getSessionToken = async (): Promise<string | null> => {
  if (!Constants.expoConfig || !Constants.expoConfig.extra) {
    return null;
  }
  const { tokenKey, refreshTokenKey, expirationKey } =
    Constants.expoConfig.extra;

  const storedToken = await AsyncStorage.getItem(tokenKey);
  const expirationTime = await AsyncStorage.getItem(expirationKey);
  const refreshToken = await AsyncStorage.getItem(refreshTokenKey);
  const currentTime = new Date().getTime();

  if (storedToken && expirationTime && currentTime < Number(expirationTime)) {
    return storedToken;
  }

  if (!refreshToken) {
    await AsyncStorage.removeItem(tokenKey);
    await AsyncStorage.removeItem(expirationKey);
    await AsyncStorage.removeItem(refreshTokenKey);
    return null;
  }

  try {
    const data = await refreshAccessToken(refreshToken);
    if (!data.access_token) {
      return null;
    }

    const newAccessToken = data.access_token as string;
    const newExpirationTime = currentTime + data.expires_in * 1000;

    await AsyncStorage.setItem(tokenKey, newAccessToken);
    await AsyncStorage.setItem(expirationKey, newExpirationTime.toString());

    return newAccessToken;
  } catch (error) {
    console.error('Failed to refresh token', error);
    return null;
  }
};
