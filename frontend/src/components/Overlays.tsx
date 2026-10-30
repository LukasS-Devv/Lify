import { createElement, useEffect, useRef, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, layout, overlayTokens, radius, spacing } from '@/theme/tokens';
import { IconButton } from './IconButton';

const WEB_STYLE_ID = 'lify-overlay-global-styles';

function installOverlayStyles(): () => void {
  if (Platform.OS !== 'web') return () => undefined;
  let style = document.getElementById(WEB_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = WEB_STYLE_ID;
    style.textContent = `
      :root { --overlay-bg: ${overlayTokens.background}; --overlay-border: 1px solid ${overlayTokens.border}; --overlay-shadow: ${overlayTokens.shadow}; --overlay-radius: ${radius.md}px; --dialog-radius: ${overlayTokens.dialogRadius}px; --sheet-radius: ${overlayTokens.sheetRadius}px; --scrim: ${overlayTokens.scrim}; --item-height: ${overlayTokens.itemHeight}px; --item-radius: ${overlayTokens.itemRadius}px; --item-hover: ${overlayTokens.itemHover}; --motion-in: ${overlayTokens.motionIn}; --motion-out: ${overlayTokens.motionOut}; --accent: ${colors.accent}; --danger: ${colors.danger}; }
      [id$="-scrim"] { background: var(--scrim); }
      .lify-overlay-surface { box-sizing: border-box; padding: 20px 24px; border: var(--overlay-border); box-shadow: var(--overlay-shadow); animation: lify-overlay-in var(--motion-in) both; }
      .lify-overlay-surface input { box-sizing: border-box; }
      .lify-overlay-surface input:focus { outline: none; border-color: ${colors.accent}; }
      @keyframes lify-overlay-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
      @media (prefers-reduced-motion: reduce) { .lify-overlay-surface { animation: lify-overlay-fade 140ms ease-out both; } @keyframes lify-overlay-fade { from { opacity: 0; } to { opacity: 1; } } }
      .lify-overlay-item { min-height: var(--item-height); border-radius: var(--item-radius); }
      @media (hover: hover) { .lify-overlay-surface [role="menuitem"]:hover, .lify-overlay-surface [role="checkbox"]:hover { background: var(--item-hover); } }
    `;
    document.head.appendChild(style);
  }
  return () => undefined;
}

type SurfaceVariant = 'sheet' | 'dialog' | 'picker' | 'menu' | 'fullscreen';

function OverlaySurface({
  visible,
  onClose,
  children,
  variant,
  title,
  width,
  busy = false,
  closeOnBackdrop = true,
  contentStyle,
  position,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  variant: SurfaceVariant;
  title?: string;
  width?: number;
  busy?: boolean;
  closeOnBackdrop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  position?: { x: number; y: number };
}) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = viewportWidth >= layout.desktopBreakpoint;
  const isMobileSheet = !desktop && (variant === 'sheet' || variant === 'picker' || variant === 'menu');
  const rootId = useRef(`lify-overlay-${Math.random().toString(36).slice(2)}`).current;
  const titleId = `${rootId}-title`;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const cleanupStyles = installOverlayStyles();
    const root = document.getElementById(rootId);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(
      root?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => element.offsetParent !== null);
    const focusTimer = window.setTimeout(() => (focusable()[0] ?? root)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      const menuNavigationKey = variant === 'menu' && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key);
      if (event.key !== 'Tab' && !menuNavigationKey) return;
      const elements = focusable();
      if (menuNavigationKey) {
        const menuItems = Array.from(
          root?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="checkbox"]') ?? [],
        ).filter((element) => element.offsetParent !== null);
        if (menuItems.length > 0) {
          event.preventDefault();
          const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
          const nextIndex = event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? menuItems.length - 1
              : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + menuItems.length) % menuItems.length;
          menuItems[nextIndex]?.focus();
          return;
        }
      }
      if (event.key !== 'Tab') return;
      if (elements.length === 0) {
        event.preventDefault();
        root?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
      cleanupStyles();
    };
  }, [busy, rootId, visible]);

  if (!visible) return null;
  const surfaceWidth = width ?? (variant === 'menu' ? 280 : variant === 'picker' ? 420 : variant === 'dialog' ? 400 : 480);
  const anchored = Platform.OS === 'web' && desktop && variant === 'menu' && position;
  const left = anchored
    ? Math.max(spacing.md, Math.min(position.x - surfaceWidth, viewportWidth - surfaceWidth - spacing.md))
    : undefined;
  const top = anchored
    ? Math.max(spacing.md, Math.min(position.y, viewportHeight - 420))
    : undefined;
  const closeLabel = 'Close overlay';
  const surfaceStyle = [
    s.surface,
    isMobileSheet ? s.sheet : s.centered,
    variant === 'picker' && s.picker,
    variant === 'menu' && (desktop ? s.menu : s.sheet),
    variant === 'fullscreen' && s.fullscreen,
    desktop && !anchored && { width: Math.min(surfaceWidth, viewportWidth - spacing.lg * 2) },
    !desktop && variant === 'dialog' && { width: Math.min(surfaceWidth, viewportWidth - spacing.xl * 2) },
    anchored && { position: 'absolute' as const, left, top },
    { paddingBottom: isMobileSheet ? Math.max(insets.bottom, spacing.md) + spacing.md : spacing.lg },
    { backgroundColor: overlayTokens.background },
    variant === 'dialog' && { borderRadius: overlayTokens.dialogRadius },
    isMobileSheet && { borderTopLeftRadius: overlayTokens.sheetRadius, borderTopRightRadius: overlayTokens.sheetRadius },
    contentStyle,
  ];
  const surfaceContent = (
    <>
      {title ? (
        <View style={s.header}>
          <Text nativeID={titleId} accessibilityRole="header" style={s.title}>{title}</Text>
          {desktop && variant === 'picker' ? (
            <IconButton icon="close" label={closeLabel} size={18} onPress={onClose} />
          ) : null}
        </View>
      ) : null}
      {children}
    </>
  );
  const surface = Platform.OS === 'web'
    ? createElement('div', {
        id: rootId,
        role: variant === 'menu' ? 'menu' : 'dialog',
        'aria-modal': true,
        'aria-labelledby': title ? titleId : undefined,
        tabIndex: -1,
        className: 'lify-overlay-surface',
        style: StyleSheet.flatten(surfaceStyle),
      }, surfaceContent)
    : (
      <View
        nativeID={rootId}
        accessibilityRole="none"
        accessibilityLabel={title}
        accessibilityViewIsModal
        style={surfaceStyle}
      >
        {surfaceContent}
      </View>
    );

  return (
    <Modal
      transparent
      visible
      animationType={variant === 'fullscreen' ? 'slide' : isMobileSheet ? 'slide' : 'fade'}
      onRequestClose={() => { if (!busy) onClose(); }}
      statusBarTranslucent
    >
      <View style={[s.scrim, isMobileSheet && s.scrimColumn]} nativeID={`${rootId}-scrim`}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          disabled={busy || !closeOnBackdrop}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, s.scrimPressable]}
        />
        {surface}
      </View>
    </Modal>
  );
}

export function BottomSheet(props: Omit<Parameters<typeof OverlaySurface>[0], 'variant' | 'width'>) {
  return <OverlaySurface {...props} variant="sheet" />;
}

export function Dialog(props: Omit<Parameters<typeof OverlaySurface>[0], 'variant'>) {
  return <OverlaySurface {...props} variant="dialog" />;
}

export function FullscreenOverlay(props: Omit<Parameters<typeof OverlaySurface>[0], 'variant' | 'width'>) {
  return <OverlaySurface {...props} variant="fullscreen" />;
}

export function PickerModal({
  children,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  footer,
  ...props
}: Omit<Parameters<typeof OverlaySurface>[0], 'variant'> & {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  footer?: ReactNode;
}) {
  return (
    <OverlaySurface {...props} variant="picker" width={420}>
      {onSearchChange ? (
        <TextInput
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={s.search}
        />
      ) : null}
      <ScrollView style={s.pickerList} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </OverlaySurface>
  );
}

export function ContextMenu({
  children,
  position,
  ...props
}: Omit<Parameters<typeof OverlaySurface>[0], 'variant'>) {
  return (
    <OverlaySurface {...props} variant="menu" position={position}>
      {children}
    </OverlaySurface>
  );
}

export function Toast({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return createElement(
    View,
    { accessibilityRole: 'alert', style: [s.toast, style] },
    children,
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay },
  scrimColumn: { justifyContent: 'flex-end' },
  scrimPressable: { backgroundColor: 'transparent' },
  surface: { width: '100%', maxHeight: '90%', overflow: 'hidden', gap: spacing.md, paddingVertical: 20, paddingHorizontal: spacing.lg, backgroundColor: overlayTokens.background, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, elevation: 16 },
  centered: { alignSelf: 'center', borderRadius: overlayTokens.dialogRadius },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '88%', marginTop: 'auto', borderTopLeftRadius: overlayTokens.sheetRadius, borderTopRightRadius: overlayTokens.sheetRadius, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  picker: { maxHeight: '70%' },
  menu: { width: 280, maxWidth: 280, padding: spacing.md },
  fullscreen: { flex: 1, width: '100%', maxWidth: '100%', maxHeight: '100%', height: '100%', margin: 0, borderRadius: 0 },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.xs },
  title: { flex: 1, color: colors.text, fontSize: font.lg, fontWeight: '600' },
  search: { height: 48, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.md },
  pickerList: { flexShrink: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.xs },
  toast: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, elevation: 8 },
});
