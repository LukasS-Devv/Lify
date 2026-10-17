import * as React from 'react';

import { HomeScreen } from '@screens';
import { Header } from '@components';

import { Pages } from '@config';

export default function Home() {
  return (
    <>
      <Header tab={Pages.HOME} />
      <HomeScreen />
    </>
  );
}
