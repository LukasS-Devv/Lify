import * as React from 'react';

import { SearchScreen } from '@screens';
import { Header } from '@components';

import { Pages } from '@config';

export default function Search() {
  return (
    <>
      <Header tab={Pages.SEARCH} />
      <SearchScreen />
    </>
  );
}
