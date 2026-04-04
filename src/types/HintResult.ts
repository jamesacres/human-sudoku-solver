import type { Placement } from './Placement';
import type { Elimination } from './Elimination';
import type { ChainNode } from './ChainNode';
import type { Technique } from './Technique';

export interface HintResult {
  technique: Technique;
  placements: Placement[];
  eliminations: Elimination[];
  // Cells involved in the pattern (for highlighting)
  patternCells: number[];
  hiddenDigits?: number[]; // populated for hidden group techniques (hiddenPair/Triple/Quad)
  patternDigits?: number[]; // populated for techniques needing extra digit context (UR floor digits, wWing link digit)
  chainPath?: ChainNode[]; // populated for chain techniques
  stemCell?: number; // populated for deathBlossom
  petalCells?: number[][]; // populated for deathBlossom — one array per petal ALS
  als1Cells?: number[]; // populated for alsXZ
  als2Cells?: number[]; // populated for alsXZ
  eureka?: string;
  explanation?: string;
}
