import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, spacing } from '@/theme/tokens';

export function Screen({ title, right, children, style }: {
  title?: string; right?: ReactNode; children: ReactNode; style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={[s.root, style]} edges={['top']}>
      {title ? (
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
});
