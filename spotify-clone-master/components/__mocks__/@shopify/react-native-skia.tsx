//eslint-disable
const MockCanvas = ({ children, style }: any) => (
  <div style={style}>{children}</div>
);

const MockColor = jest.fn();
const MockAnimatedProp = jest.fn();

export const Canvas = MockCanvas;
export const Color = MockColor;
export const AnimatedProp = MockAnimatedProp;
export const LinearGradient = jest.fn(({ colors }) => (
  <div style={{ background: `linear-gradient(${colors.join(', ')})` }} />
));
export const Rect = jest.fn(({ children }) => <div>{children}</div>);
export const vec = jest.fn((x, y) => ({ x, y }));
//eslint-enale
