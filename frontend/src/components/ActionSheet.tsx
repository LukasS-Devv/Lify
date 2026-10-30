import { View } from 'react-native';
import { useTranslation } from '@/i18n';
import type { IconName } from './Icon';
import { ContextMenu } from './Overlays';
import { SheetDivider, SheetHeader, SheetRow } from './overlay';

export interface SheetItem { icon: IconName; label: string; onPress: () => void; danger?: boolean }

/** Folha inferior com lista de ações. */
export function ActionSheet({ visible, title, items, onClose, position }: {
  visible: boolean; title?: string; items: SheetItem[]; onClose: () => void; position?: { x: number; y: number };
}) {
  useTranslation();
  return (
    <ContextMenu visible={visible} onClose={onClose} position={position}>
      {title ? <SheetHeader title={title} /> : null}
      {items.map((it) => (
        <View key={it.label}>
          {it.danger ? <SheetDivider /> : null}
          <SheetRow
            role="menuitem"
            icon={it.icon}
            label={it.label}
            destructive={it.danger}
            onPress={() => { onClose(); it.onPress(); }}
          />
        </View>
      ))}
    </ContextMenu>
  );
}

