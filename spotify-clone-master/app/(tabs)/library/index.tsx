import * as React from 'react';

import { LibraryScreen } from '@screens';
import { Header } from '@components';

import { Pages } from '@config';

export default function Library() {
  return (
    <>
      <Header tab={Pages.LIBRARY} />
      <LibraryScreen />
    </>
  );
}
