import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';

export type LibraryCategory = 'favorites' | 'history' | 'playlists';

export function LibraryRelated({ value, onChange, labels }: {
  value: LibraryCategory;
  onChange: (category: LibraryCategory) => void;
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
              onPress={() => onChange(category)}
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
  scroll: { backgroundColor: colors.bg, paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md },
  category: { backgroundColor: colors.surfaceAlt, paddingVertical: spacing.sm, paddingHorizontal: 14, borderRadius: radius.pill },
  label: { color: colors.text, fontSize: font.sm },
  selected: { backgroundColor: colors.accent },
  selectedLabel: { color: colors.accentText },
});
