import type { Notes } from './Notes';
import type { Value } from './Value';

export interface PuzzleBox<T extends Value = number | Notes> {
  0: T[];
  1: T[];
  2: T[];
}
