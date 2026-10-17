import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';

export type LibraryCategory = 'favorites' | 'history' | 'playlists';

export function LibraryRelated({ value, onChange, labels }: {
  value: LibraryCategory | null;
  onChange: (category: LibraryCategory | null) => void;
  labels: Record<LibraryCategory, string>;
}) {
  const categories: LibraryCategory[] = ['favorites', 'history', 'playlists'];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll}>
      <View style={s.row}>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md },
  category: { backgroundColor: colors.surfaceAlt, paddingVertical: spacing.sm, paddingHorizontal: 16, borderRadius: radius.pill },
  label: { color: colors.text, fontSize: font.sm },
  selected: { backgroundColor: colors.accent },
  selectedLabel: { color: colors.accentText },
});
