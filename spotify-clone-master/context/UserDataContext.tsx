import * as React from 'react';

import { UserModel } from '@models';
import { getUser } from '@api';

export type UserDataProviderPropsType = {
  children: React.ReactNode;
};

export type UserContextType = {
  userData: UserModel;
};

const defaultUserData: UserModel = {
  id: '',
  type: 'user',
  displayName: '',
  imageURL: '',
};

export const UserDataContext = React.createContext<UserContextType>({
  userData: defaultUserData,
});

export const UserDataProvider = ({ children }: UserDataProviderPropsType) => {
  const [userData, setUserData] = React.useState<UserModel>(defaultUserData);

  React.useEffect(() => {
    (async () => {
      try {
        const user = await getUser();
        setUserData(user);
      } catch (error) {
        console.error('ERROR: ', error);
      }
    })();
  }, []);

  return (
    <UserDataContext.Provider value={{ userData }}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = (): UserContextType => {
  const context = React.useContext(UserDataContext);
  if (context === null) {
    throw new Error('Failed to access userData context: "context" is null');
  }

  return context;
};
