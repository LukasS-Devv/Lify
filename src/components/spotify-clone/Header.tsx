import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function Header({ title, right, related }: { title: string; right?: ReactNode; related?: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View>
      <View style={[s.container, { paddingTop: insets.top + 35 }]}>
        <View style={s.profile}>
          <Image source={require('../../../assets/images/spotify-clone-user.png')} style={s.profileImage} />
        </View>
        <Text numberOfLines={1} style={s.title}>{title}</Text>
        {right}
      </View>
      {related}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.bg,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    zIndex: 5,
  },
  profile: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  profileImage: { width: '100%', height: '100%' },
  title: { flex: 1, color: colors.text, fontSize: font.xl, fontWeight: '800' },
});
