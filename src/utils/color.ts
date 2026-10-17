/**
 * Cores determinísticas a partir de um texto (id da faixa/playlist).
 * Evita dependência nativa para "extrair a cor da capa": o mesmo id sempre
 * gera o mesmo tom, então o degradê de uma playlist/faixa é estável.
 */

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(Math.max(s, 0), 1);
  const lig = Math.min(Math.max(l, 0), 1);
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x]
    : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export const hueFor = (seed: string): number => hashString(seed) % 360;

/** Cor sólida estável para o `seed`. `lightness` controla o quão escura fica. */
export const tintFor = (seed: string, lightness = 0.32, saturation = 0.5): string =>
  hslToHex(hueFor(seed), saturation, lightness);

/** [topo, base] de um degradê que termina na cor de fundo do app. */
export const gradientFor = (seed: string, base: string): [string, string] => [tintFor(seed, 0.34, 0.55), base];
