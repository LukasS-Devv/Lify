/**
 * Design tokens do Lify. Identidade própria: fundo grafite com leve tom azul-violeta
 * e acento verde-menta. Para trocar o acento do app inteiro, mude só `accent`/`accentSoft`.
 */
export const colors = {
  bg: '#121212',
  surface: '#181818',
  surfaceAlt: '#282828',
  elevated: '#333333',
  border: '#282828',
  text: '#FFFFFF',
  textMuted: '#A8A8A8',
  textFaint: '#A7A7A7',
  accent: '#C6E27A',
  accentSoft: 'rgba(198, 226, 122, 0.16)',
  accentText: '#000000',
  danger: '#F15E6C',
  overlay: 'rgba(0, 0, 0, 0.60)',
};

export const overlayTokens = {
  background: '#141414',
  border: 'rgba(255, 255, 255, 0.06)',
  divider: 'rgba(255, 255, 255, 0.08)',
  shadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.6)',
  itemHover: 'rgba(255, 255, 255, 0.08)',
  itemHeight: 40,
  itemRadius: 8,
  motionIn: '220ms ease-out',
  motionOut: '100ms ease-in',
  dialogRadius: 16,
  sheetRadius: 24,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 6, md: 12, lg: 20, xl: 28, pill: 999 };
export const font = { xs: 13, sm: 13, md: 14, lg: 16, xl: 22, xxl: 30, hero: 34 };

export const layout = {
  desktopBreakpoint: 1024,
  artwork: 52,
  miniPlayerHeight: 64,
  tabBarHeight: 56,
  shelfCard: 148,
  /** Espaço extra no fim das listas para não ficarem atrás do mini-player. */
  listBottomPad: 24,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};
