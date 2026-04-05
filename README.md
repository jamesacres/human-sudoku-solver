# human-sudoku-solver

A TypeScript library that solves Sudoku puzzles using human techniques. Rather than brute-force backtracking, it applies logical solving methods in the same order a human would — making it suitable for hint systems, puzzle analysis, and step-by-step walkthroughs.

## Installation

```bash
npm install human-sudoku-solver
```

## Usage

### Solve a puzzle

```typescript
import { humanSolve } from 'human-sudoku-solver';

// 81-cell flat array, row-major order. 0 = empty, 1–9 = digit.
const grid = [
  2,0,1,0,8,0,0,0,0,
  9,0,0,1,7,0,0,4,0,
  0,7,0,0,0,1,5,2,8,
  // ...
];

const { grid: solved, steps } = humanSolve(grid);

console.log(`Solved in ${steps.length} steps`);
steps.forEach(step => console.log(step.technique, step.explanation));
```

### Step-by-step solving

```typescript
import { buildCandidates, findHint, applyHint } from 'human-sudoku-solver';

let grid = [/* initial puzzle */];
let candidates = buildCandidates(grid);

while (true) {
  const hint = findHint(grid, candidates);
  if (!hint) break;

  console.log(hint.technique);   // e.g. 'nakedSingle'
  console.log(hint.eureka);      // e.g. 'r1c3=5'
  console.log(hint.explanation); // human-readable description

  ({ grid, candidates } = applyHint(grid, candidates, hint));
}
```

### Parse puzzle text format

```typescript
import { puzzleTextToPuzzle, puzzleToGrid, humanSolve } from 'human-sudoku-solver';

// 81-character string: '.' or '0' = empty, '1'–'9' = digit
const puzzle = puzzleTextToPuzzle('2.1.8....9..17..4..7....528...');
const grid = puzzleToGrid(puzzle);
const { grid: solved } = humanSolve(grid);
```

## API

### Core functions

#### `humanSolve(grid: Grid)`

Solves a puzzle to completion using human techniques.

Returns `{ grid: Grid; candidates: Candidates; steps: HintResult[] }`.

#### `findHint(grid: Grid, candidates: Candidates)`

Finds the next logical step without applying it.

Returns `HintResult | null`.

#### `applyHint(grid: Grid, candidates: Candidates, hint: HintResult)`

Applies a hint to the current state.

Returns `{ grid: Grid; candidates: Candidates }`.

#### `buildCandidates(grid: Grid)`

Builds the initial candidate sets for all empty cells.

Returns `Candidates` — an array of 81 `Set<number>` values (one per cell).

#### `isGridInvalid(grid: Grid)`

Returns `true` if the grid contains duplicate digits in any row, column, or box.

### Format conversion

#### `puzzleTextToPuzzle(text: string)`

Converts an 81-character puzzle string to a `Puzzle<number>`.

#### `puzzleToPuzzleText(puzzle: Puzzle<number | Notes>)`

Converts a `Puzzle` back to an 81-character string.

#### `puzzleToGrid(puzzle: Puzzle<number | Notes>)`

Converts a `Puzzle` to a flat 81-cell `Grid`.

#### `gridToPuzzle(grid: Grid)`

Converts a flat `Grid` to a `Puzzle<number>`.

## Types

### `Grid`

Flat array of 81 numbers in row-major order. `0` = empty, `1`–`9` = digit.

```
cell index = row * 9 + col
```

### `HintResult`

```typescript
interface HintResult {
  technique: Technique;
  placements: Placement[];      // cells to fill: { cell, digit }
  eliminations: Elimination[];  // candidates to remove: { cell, digit }
  patternCells: number[];       // cells involved in the pattern (for highlighting)
  eureka?: string;              // standard Sudoku notation
  explanation?: string;         // human-readable description
  chainPath?: ChainNode[];      // populated for chain techniques
  hiddenDigits?: number[];      // populated for hidden group techniques
  patternDigits?: number[];     // populated for some techniques (e.g. UR floor digits)
  als1Cells?: number[];         // populated for ALS XZ
  als2Cells?: number[];         // populated for ALS XZ
  stemCell?: number;            // populated for Death Blossom
  petalCells?: number[][];      // populated for Death Blossom
}
```

### `ChainNode`

```typescript
interface ChainNode {
  cell: number;
  digit: number;
  isOn: boolean;                       // true = candidate is ON in this node
  cells?: number[];                    // grouped node: multiple cells in same house
  linkToNext?: 'strong' | 'weak';
}
```

### `Technique`

The full set of supported techniques, in the order they are attempted:

| Technique | Description |
|---|---|
| `nakedSingle` | Only one candidate remains in a cell |
| `hiddenSingleBox` / `hiddenSingleRow` / `hiddenSingleCol` | Digit can only go in one cell within a house |
| `hiddenPair` / `hiddenTriple` / `hiddenQuad` | N digits confined to N cells in a house |
| `lockedCandidatePointing` | Box candidates for a digit align in one row/col, eliminating from that row/col outside the box |
| `lockedCandidateClaiming` | Row/col candidates for a digit align in one box, eliminating from that box |
| `nakedPair` / `nakedTriple` / `nakedQuad` | N cells in a house share exactly N candidates |
| `xWing` / `swordfish` / `jellyfish` | Fish patterns of size 2, 3, 4 |
| `skyscraper` | Two rows/cols share a digit in exactly two columns/rows |
| `twoStringKite` | Intersecting conjugate pairs in a box |
| `yWing` / `xyzWing` | Pivot cell with two/three bivalue wings |
| `finnedXWing` / `finnedSwordfish` / `finnedJellyfish` | Fish with extra fin candidates |
| `wWing` | Two bivalue cells connected by a strong link on a shared digit |
| `emptyRectangle` | Eliminates via an empty rectangle in a box |
| `uniqueRectangleType1`–`Type4` | Avoids deadly pattern in a rectangle of four cells |
| `bug` | Bivalue Universal Grave — all candidates bivalue except one |
| `xyChain` | Chain of bivalue cells |
| `aic` / `aicRing` | Alternating Inference Chain |
| `groupedAIC` | AIC with grouped nodes (multiple cells as one node) |
| `alsXZ` | Almost Locked Sets linked by a restricted common candidate |
| `sueDeCoq` | Sue de Coq pattern in a box/line intersection |
| `deathBlossom` | ALS petals hanging off a stem cell |
| `nishio` | Contradiction-based elimination |
| `nishioNet` | Nishio extended to a network |
| `cellRegionForcingChain` / `cellRegionForcingNet` | All candidates in a cell/region force the same conclusion |
| `forcingChain` | Multiple chains from the same candidate converge |

## Development

```bash
npm install        # install dependencies
npm test           # run tests
npm run build      # compile to dist/
npm run lint       # lint
npm run typecheck  # type-check without emitting
```

Output is an ES module at `dist/index.mjs` with TypeScript declarations at `dist/index.d.mts`.

## License

[GPL-3.0](LICENSE)
