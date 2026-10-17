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
          <Text accessibilityRole="header" style={s.title}>{title}</Text>
          <View style={s.right}>{right}</View>
        </View>
      ) : null}
      {children}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800', flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
