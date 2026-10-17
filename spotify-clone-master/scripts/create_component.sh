FILENAME=$1

mkdir ./components/$FILENAME
mkdir ./components/$FILENAME/__tests__

cat >./components/$FILENAME/$FILENAME.tsx <<EOL
import * as React from "react";
import { View } from "react-native";

import { styles } from "./styles";

export type ${FILENAME}PropsType = {};

export const ${FILENAME} = ({}: ${FILENAME}PropsType) => {
  return <View style={styles.container}></View>;
};
EOL

cat >./components/$FILENAME/index.ts <<EOL
export { $FILENAME } from './$FILENAME'
EOL

cat >./components/$FILENAME/styles.ts << EOL
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {},
});
EOL

cat >./components/$FILENAME/__tests__/$FILENAME.tsx << EOL
describe('${FILENAME}', () => {
  // todo
  it.skip('todo', () => {
    expect(jest.fn()).toBe(jest.fn());
  });
});
EOL

yarn run prettier --write ./components/$FILENAME/*.{ts,tsx}