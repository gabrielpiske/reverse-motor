/** As 12 bancadas do laboratório, identificadas de A até L. */
export const BANCADAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export type BancadaId = (typeof BANCADAS)[number];

export function isBancadaId(value: string): value is BancadaId {
  return (BANCADAS as readonly string[]).includes(value);
}
