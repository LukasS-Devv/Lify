import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export function SheetDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View accessibilityElementsHidden style={[s.divider, style]} />;
}

const s = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' },
});
