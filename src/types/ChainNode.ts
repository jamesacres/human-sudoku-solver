export interface ChainNode {
  cell: number;
  digit: number;
  isOn: boolean; // true = candidate is asserted, false = candidate is refuted
  cells?: number[]; // for group nodes (grouped AIC)
  linkToNext?: 'strong' | 'weak'; // link type to next node in chain
}
