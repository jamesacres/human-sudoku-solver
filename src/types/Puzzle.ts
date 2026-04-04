import type { Notes } from './Notes';
import type { PuzzleRow } from './PuzzleRow';
import type { Value } from './Value';

export interface Puzzle<T extends Value = number | Notes> {
  0: PuzzleRow<T>;
  1: PuzzleRow<T>;
  2: PuzzleRow<T>;
}
