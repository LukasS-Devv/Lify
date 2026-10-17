import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
