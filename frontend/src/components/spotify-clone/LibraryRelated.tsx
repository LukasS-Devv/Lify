import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';

export type LibraryCategory = 'favorites' | 'history' | 'playlists';

export function LibraryRelated({ value, onChange, labels, desktop = false }: {
  value: LibraryCategory | null;
  onChange: (category: LibraryCategory | null) => void;
  labels: Record<LibraryCategory, string>;
  desktop?: boolean;
}) {
  const categories: LibraryCategory[] = ['favorites', 'history', 'playlists'];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.scroll, desktop && s.desktopScroll]}>
      <View style={[s.row, desktop && s.desktopRow]}>
        {categories.map((category) => {
          const active = value === category;
          return (
            <Pressable
              key={category}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(active ? null : category)}
              style={[s.category, active && s.selected]}
            >
              <Text style={[s.label, active && s.selectedLabel]}>{labels[category]}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { backgroundColor: colors.bg, paddingBottom: spacing.sm },
  desktopScroll: { backgroundColor: 'transparent', paddingBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md },
  desktopRow: { paddingHorizontal: 0 },
  category: { backgroundColor: colors.surfaceAlt, paddingVertical: spacing.sm, paddingHorizontal: 16, borderRadius: radius.pill },
  label: { color: colors.text, fontSize: font.sm },
  selected: { backgroundColor: colors.accent },
  selectedLabel: { color: colors.accentText },
});
