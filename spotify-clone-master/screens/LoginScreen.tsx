import * as React from 'react';
import {
  makeRedirectUri,
  useAuthRequest,
  ResponseType,
} from 'expo-auth-session';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { setSessionToken } from '@api';
import { AuthResponse, ExpoConfigType } from '@config';
import { Login } from '@components';

export const LoginScreen = () => {
  const router = useRouter();

  const { clientID, authorizationEndpoint, tokenEndpoint } = (
    Constants.expoConfig as ExpoConfigType
  ).extra;

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: clientID as string,
      scopes: [
        'user-read-recently-played',
        'user-top-read',
        'user-library-read',
        'user-read-playback-position',
        'user-read-private',
        'user-read-email',
        'user-follow-read',
        'playlist-read-private',
      ],
      responseType: ResponseType.Token,
      redirectUri: makeRedirectUri(),
    },
    {
      authorizationEndpoint: authorizationEndpoint as string,
      tokenEndpoint: tokenEndpoint as string,
    }
  );

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { access_token, refresh_token, expires_in } = response.params;
      setSessionToken(access_token, refresh_token, expires_in);
    }
  }, [response]);

  const handlePress = async () => {
    try {
      const response = await promptAsync();

      if (response.type !== AuthResponse.SUCCESS) {
        return;
      }

      router.replace('/home');
    } catch (error) {
      console.error(error);
    }
  };

  return <Login handlePress={handlePress} isPressableDisabled={!request} />;
};
