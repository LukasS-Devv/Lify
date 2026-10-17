import axios from 'axios';

import { UserModel } from '@models';
import { UserResponseType } from '@config';
import { parseToUser } from '@utils';

import { BASE_URL, fileSystemMiddleware, getSessionToken } from '../config';

export const getUser = async (): Promise<UserModel> => {
  try {
    const token = await getSessionToken();
    const response = (await axios.get(`${BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: UserResponseType };

    return parseToUser(response.data);
  } catch (error) {
    console.error('Error getting user data', error);
    throw error;
  }
};

// eslint-disable-next-line
const getUserFromFileSystem = async () =>
  await fileSystemMiddleware<UserModel>('user_profile', getUser);
