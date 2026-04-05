import type { Notes } from './Notes';
import type { PuzzleBox } from './PuzzleBox';
import type { Value } from './Value';

export interface PuzzleRow<T extends Value = number | Notes> {
  0: PuzzleBox<T>;
  1: PuzzleBox<T>;
  2: PuzzleBox<T>;
}
