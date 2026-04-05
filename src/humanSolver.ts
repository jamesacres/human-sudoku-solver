import type { Puzzle } from './types/Puzzle';
import type { Notes } from './types/Notes';
import type { HintResult } from './types/HintResult';
import { buildEureka, buildExplanation } from './humanSolverNotation';
import type { Technique } from './types/Technique';
import type { Elimination } from './types/Elimination';
import type { ChainNode } from './types/ChainNode';

// A flat 81-cell grid representation (row-major, 0-indexed)
// cell index = row * 9 + col
type Grid = number[]; // 0 = empty, 1-9 = digit
type Candidates = Set<number>[]; // index = cell, set of possible digits

const withNotation = (hint: HintResult | null): HintResult | null => {
  if (hint === null) return null;
  return {
    ...hint,
    eureka: buildEureka(hint),
    explanation: buildExplanation(hint),
  };
};

// ---- Coordinate helpers ----

const cellRow = (cell: number) => Math.floor(cell / 9);
const cellCol = (cell: number) => cell % 9;
const cellBox = (cell: number) =>
  Math.floor(cellRow(cell) / 3) * 3 + Math.floor(cellCol(cell) / 3);

// ---- Houses ----

const buildHouses = (): number[][] => {
  const houses: number[][] = [];
  for (let r = 0; r < 9; r++) {
    const row: number[] = [];
    for (let c = 0; c < 9; c++) row.push(r * 9 + c);
    houses.push(row);
  }
  for (let c = 0; c < 9; c++) {
    const col: number[] = [];
    for (let r = 0; r < 9; r++) col.push(r * 9 + c);
    houses.push(col);
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box: number[] = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) box.push((br * 3 + r) * 9 + (bc * 3 + c));
      houses.push(box);
    }
  }
  return houses;
};

const HOUSES = buildHouses();
const ROW_HOUSES = HOUSES.slice(0, 9);
const COL_HOUSES = HOUSES.slice(9, 18);
const BOX_HOUSES = HOUSES.slice(18, 27);

// ---- Peers ----

const buildPeers = (): Set<number>[] => {
  const peers: Set<number>[] = [];
  for (let cell = 0; cell < 81; cell++) {
    const p = new Set<number>();
    const r = cellRow(cell),
      c = cellCol(cell),
      b = cellBox(cell);
    for (const c2 of [...ROW_HOUSES[r], ...COL_HOUSES[c], ...BOX_HOUSES[b]])
      if (c2 !== cell) p.add(c2);
    peers.push(p);
  }
  return peers;
};

const PEERS = buildPeers();

// ---- Puzzle conversion ----

export const puzzleToGrid = (puzzle: Puzzle<number | Notes>): Grid => {
  const grid: Grid = new Array(81).fill(0);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const boxX = Math.floor(col / 3);
      const boxY = Math.floor(row / 3);
      const cellX = col % 3;
      const cellY = row % 3;
      const val =
        puzzle[boxX as 0 | 1 | 2][boxY as 0 | 1 | 2][cellX as 0 | 1 | 2][cellY];
      grid[row * 9 + col] = typeof val === 'number' ? val : 0;
    }
  }
  return grid;
};

export const gridToPuzzle = (grid: Grid): Puzzle<number> => {
  const puzzle: Puzzle<number> = {
    0: {
      0: { 0: [], 1: [], 2: [] },
      1: { 0: [], 1: [], 2: [] },
      2: { 0: [], 1: [], 2: [] },
    },
    1: {
      0: { 0: [], 1: [], 2: [] },
      1: { 0: [], 1: [], 2: [] },
      2: { 0: [], 1: [], 2: [] },
    },
    2: {
      0: { 0: [], 1: [], 2: [] },
      1: { 0: [], 1: [], 2: [] },
      2: { 0: [], 1: [], 2: [] },
    },
  };
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const boxX = Math.floor(col / 3) as 0 | 1 | 2;
      const boxY = Math.floor(row / 3) as 0 | 1 | 2;
      const cellX = (col % 3) as 0 | 1 | 2;
      const cellY = (row % 3) as 0 | 1 | 2;
      if (!puzzle[boxX][boxY][cellX]) puzzle[boxX][boxY][cellX] = [];
      (puzzle[boxX][boxY][cellX] as number[])[cellY] = grid[row * 9 + col];
    }
  }
  return puzzle;
};

// ---- Candidate building ----

export const buildCandidates = (grid: Grid): Candidates => {
  const candidates: Candidates = [];
  for (let cell = 0; cell < 81; cell++) {
    if (grid[cell] !== 0) {
      candidates.push(new Set());
      continue;
    }
    const possible = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const peer of PEERS[cell]) {
      if (grid[peer] !== 0) possible.delete(grid[peer]);
    }
    candidates.push(possible);
  }
  return candidates;
};

export const isGridInvalid = (grid: Grid): boolean => {
  for (let cell = 0; cell < 81; cell++) {
    const val = grid[cell];
    if (val === 0) continue;
    for (const peer of PEERS[cell]) {
      if (grid[peer] === val) return true;
    }
  }
  return false;
};

// ---- Combination helper ----

const combinations = <T>(arr: T[], size: number): T[][] => {
  if (size === 0) return [[]];
  if (arr.length < size) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, size - 1).map((c) => [first, ...c]),
    ...combinations(rest, size),
  ];
};

// ============================================================
// BASIC TECHNIQUES
// ============================================================

const findNakedSingle = (candidates: Candidates): HintResult | null => {
  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size === 1) {
      const digit = [...candidates[cell]][0];
      return {
        technique: 'nakedSingle',
        placements: [{ cell, digit }],
        eliminations: [],
        patternCells: [cell],
      };
    }
  }
  return null;
};

const findHiddenSingle = (
  candidates: Candidates,
  houses: number[][],
  technique: 'hiddenSingleBox' | 'hiddenSingleRow' | 'hiddenSingleCol'
): HintResult | null => {
  for (const house of houses) {
    for (let digit = 1; digit <= 9; digit++) {
      const cells = house.filter((c) => candidates[c].has(digit));
      if (cells.length === 1)
        return {
          technique,
          placements: [{ cell: cells[0], digit }],
          eliminations: [],
          patternCells: house,
        };
    }
  }
  return null;
};

const findNakedGroup = (
  candidates: Candidates,
  size: 2 | 3 | 4
): HintResult | null => {
  const techMap: Record<2 | 3 | 4, Technique> = {
    2: 'nakedPair',
    3: 'nakedTriple',
    4: 'nakedQuad',
  };
  for (const house of HOUSES) {
    const emptyCells = house.filter((c) => candidates[c].size > 0);
    if (emptyCells.length <= size) continue;
    for (const group of combinations(emptyCells, size)) {
      const union = new Set<number>();
      for (const c of group) for (const d of candidates[c]) union.add(d);
      if (union.size !== size) continue;
      if (group.some((c) => candidates[c].size === 0)) continue;
      const eliminations: Elimination[] = [];
      for (const c of house) {
        if (group.includes(c)) continue;
        for (const d of union)
          if (candidates[c].has(d)) eliminations.push({ cell: c, digit: d });
      }
      if (eliminations.length > 0)
        return {
          technique: techMap[size],
          placements: [],
          eliminations,
          patternCells: group,
        };
    }
  }
  return null;
};

const findHiddenGroup = (
  candidates: Candidates,
  size: 2 | 3 | 4
): HintResult | null => {
  const techMap: Record<2 | 3 | 4, Technique> = {
    2: 'hiddenPair',
    3: 'hiddenTriple',
    4: 'hiddenQuad',
  };
  for (const house of HOUSES) {
    const digitCells = new Map<number, number[]>();
    for (let d = 1; d <= 9; d++) {
      const cells = house.filter((c) => candidates[c].has(d));
      if (cells.length >= 2 && cells.length <= size) digitCells.set(d, cells);
    }
    if (digitCells.size < size) continue;
    for (const digits of combinations([...digitCells.keys()], size)) {
      const cellSet = new Set<number>();
      for (const d of digits)
        for (const c of digitCells.get(d)!) cellSet.add(c);
      if (cellSet.size !== size) continue;
      const digitSet = new Set(digits);
      const eliminations: Elimination[] = [];
      for (const c of cellSet)
        for (const d of candidates[c])
          if (!digitSet.has(d)) eliminations.push({ cell: c, digit: d });
      if (eliminations.length > 0)
        return {
          technique: techMap[size],
          placements: [],
          eliminations,
          patternCells: [...cellSet],
          hiddenDigits: [...digitSet].sort((a, b) => a - b),
        };
    }
  }
  return null;
};

const findLockedCandidates = (candidates: Candidates): HintResult | null => {
  for (const box of BOX_HOUSES) {
    for (let digit = 1; digit <= 9; digit++) {
      const cells = box.filter((c) => candidates[c].has(digit));
      if (cells.length < 2) continue;
      const rows = new Set(cells.map(cellRow));
      const cols = new Set(cells.map(cellCol));
      if (rows.size === 1) {
        const eliminations = ROW_HOUSES[[...rows][0]]
          .filter((c) => !box.includes(c) && candidates[c].has(digit))
          .map((c) => ({ cell: c, digit }));
        if (eliminations.length > 0)
          return {
            technique: 'lockedCandidatePointing',
            placements: [],
            eliminations,
            patternCells: cells,
          };
      }
      if (cols.size === 1) {
        const eliminations = COL_HOUSES[[...cols][0]]
          .filter((c) => !box.includes(c) && candidates[c].has(digit))
          .map((c) => ({ cell: c, digit }));
        if (eliminations.length > 0)
          return {
            technique: 'lockedCandidatePointing',
            placements: [],
            eliminations,
            patternCells: cells,
          };
      }
    }
  }
  for (const line of [...ROW_HOUSES, ...COL_HOUSES]) {
    for (let digit = 1; digit <= 9; digit++) {
      const cells = line.filter((c) => candidates[c].has(digit));
      if (cells.length < 2) continue;
      const boxes = new Set(cells.map(cellBox));
      if (boxes.size === 1) {
        const box = BOX_HOUSES[[...boxes][0]];
        const eliminations = box
          .filter((c) => !line.includes(c) && candidates[c].has(digit))
          .map((c) => ({ cell: c, digit }));
        if (eliminations.length > 0)
          return {
            technique: 'lockedCandidateClaiming',
            placements: [],
            eliminations,
            patternCells: cells,
          };
      }
    }
  }
  return null;
};

const findFish = (
  candidates: Candidates,
  size: 2 | 3 | 4
): HintResult | null => {
  const techMap: Record<2 | 3 | 4, Technique> = {
    2: 'xWing',
    3: 'swordfish',
    4: 'jellyfish',
  };
  for (let digit = 1; digit <= 9; digit++) {
    const linePairs: [number[][], number[][]][] = [
      [ROW_HOUSES, COL_HOUSES],
      [COL_HOUSES, ROW_HOUSES],
    ];
    for (const [baseLines, coverLines] of linePairs) {
      const qualifying = baseLines
        .map((line, idx) => ({
          idx,
          cells: line.filter((c) => candidates[c].has(digit)),
        }))
        .filter((l) => l.cells.length >= 2 && l.cells.length <= size);
      if (qualifying.length < size) continue;
      for (const baseCombo of combinations(qualifying, size)) {
        const baseCells = baseCombo.flatMap((l) => l.cells);
        const coverIdxSet = new Set(
          baseLines === ROW_HOUSES
            ? baseCells.map(cellCol)
            : baseCells.map(cellRow)
        );
        if (coverIdxSet.size !== size) continue;
        const eliminations: Elimination[] = [];
        for (const coverIdx of coverIdxSet)
          for (const c of coverLines[coverIdx])
            if (!baseCells.includes(c) && candidates[c].has(digit))
              eliminations.push({ cell: c, digit });
        if (eliminations.length > 0)
          return {
            technique: techMap[size],
            placements: [],
            eliminations,
            patternCells: baseCells,
          };
      }
    }
  }
  return null;
};

// ============================================================
// FINNED FISH (Finned/Sashimi X-Wing, Swordfish, Jellyfish)
// ============================================================
// A Finned Fish is a normal Fish pattern that has extra "fin" cells in one base
// line. Fins must all be in the same box as one of the cover intersections.
// Cells that see both the fin box intersection AND are in the cover set can be eliminated.

export const findFinnedFish = (
  candidates: Candidates,
  size: 2 | 3 | 4
): HintResult | null => {
  const techMap: Record<2 | 3 | 4, Technique> = {
    2: 'finnedXWing',
    3: 'finnedSwordfish',
    4: 'finnedJellyfish',
  };
  for (let digit = 1; digit <= 9; digit++) {
    for (const [baseLines, coverLines] of [
      [ROW_HOUSES, COL_HOUSES] as [number[][], number[][]],
      [COL_HOUSES, ROW_HOUSES] as [number[][], number[][]],
    ]) {
      const coverPerp =
        baseLines === ROW_HOUSES
          ? (c: number) => cellCol(c)
          : (c: number) => cellRow(c);

      // Qualifying lines have >= 2 cells with the digit
      const qualifying = baseLines
        .map((line, idx) => ({
          idx,
          cells: line.filter((c) => candidates[c].has(digit)),
        }))
        .filter((l) => l.cells.length >= 2);

      if (qualifying.length < size) continue;

      for (const baseCombo of combinations(qualifying, size)) {
        const allBaseCells = baseCombo.flatMap((l) => l.cells);

        // Collect all cover indices used by any base cell
        const allCoverIdxs = new Set(allBaseCells.map(coverPerp));

        // We need exactly `size` "core" cover indices that form the fish body.
        // Try every subset of size `size` from allCoverIdxs as the core cover.
        const allCoverArr = [...allCoverIdxs];
        for (const coreCoverCombo of combinations(
          allCoverArr.map((idx) => ({ idx })),
          size
        )) {
          const coreCoverIdxs = new Set(coreCoverCombo.map((x) => x.idx));

          // Each base line must have at least one cell in the core cover indices
          if (
            baseCombo.some(
              (l) => !l.cells.some((c) => coreCoverIdxs.has(coverPerp(c)))
            )
          )
            continue;

          // Fin cells: any base cell whose cover index is NOT in the core
          const finCells = allBaseCells.filter(
            (c) => !coreCoverIdxs.has(coverPerp(c))
          );
          if (finCells.length === 0) continue; // that's a regular fish, not finned

          // All fin cells must be in exactly one box
          const finBoxes = new Set(finCells.map(cellBox));
          if (finBoxes.size !== 1) continue;
          const finBox = [...finBoxes][0];

          // At least one fish intersection cell (whether it has the candidate or not)
          // must share the fin box to anchor the fin to the fish body.
          const baseIdxs = baseCombo.map((l) => l.idx);
          let anchorFound = false;
          anchorLoop: for (const baseIdx of baseIdxs) {
            for (const coverIdx of coreCoverIdxs) {
              const anchorCell =
                baseLines === ROW_HOUSES
                  ? baseIdx * 9 + coverIdx
                  : coverIdx * 9 + baseIdx;
              if (cellBox(anchorCell) === finBox) {
                anchorFound = true;
                break anchorLoop;
              }
            }
          }
          if (!anchorFound) continue;

          // Eliminations: non-base cells in the core cover lines that share the fin box
          const eliminations: Elimination[] = [];
          for (const coverIdx of coreCoverIdxs) {
            for (const c of coverLines[coverIdx]) {
              if (allBaseCells.includes(c)) continue;
              if (!candidates[c].has(digit)) continue;
              if (cellBox(c) === finBox) eliminations.push({ cell: c, digit });
            }
          }
          if (eliminations.length > 0)
            return {
              technique: techMap[size],
              placements: [],
              eliminations,
              patternCells: [...allBaseCells],
            };
        }
      }
    }
  }
  return null;
};

// ============================================================
// SKYSCRAPER
// ============================================================
// For a single digit, find two rows (or columns) where the digit appears in
// exactly 2 cells and the cells share one column (or row). The "roof" cells
// (not in the shared column/row) see a common peer — eliminate the digit there.

const findSkyscraper = (candidates: Candidates): HintResult | null => {
  for (let digit = 1; digit <= 9; digit++) {
    for (const [baseLines, perpFn] of [
      [ROW_HOUSES, cellCol] as [number[][], (c: number) => number],
      [COL_HOUSES, cellRow] as [number[][], (c: number) => number],
    ]) {
      const qualifying = baseLines
        .map((line, idx) => ({
          idx,
          cells: line.filter((c) => candidates[c].has(digit)),
        }))
        .filter((l) => l.cells.length === 2);

      for (let i = 0; i < qualifying.length - 1; i++) {
        for (let j = i + 1; j < qualifying.length; j++) {
          const lineA = qualifying[i];
          const lineB = qualifying[j];
          // Find the shared perpendicular index
          const aPerp = lineA.cells.map(perpFn);
          const bPerp = lineB.cells.map(perpFn);
          let sharedPerp = -1;
          let aRoof = -1;
          let bRoof = -1;
          for (let ai = 0; ai < 2; ai++) {
            for (let bi = 0; bi < 2; bi++) {
              if (aPerp[ai] === bPerp[bi]) {
                sharedPerp = aPerp[ai];
                aRoof = lineA.cells[1 - ai];
                bRoof = lineB.cells[1 - bi];
              }
            }
          }
          if (sharedPerp === -1) continue;
          // aRoof and bRoof are not in the same line — check if they see common peers
          const eliminations: Elimination[] = [];
          for (let c = 0; c < 81; c++) {
            if (c === aRoof || c === bRoof) continue;
            if (
              candidates[c].has(digit) &&
              PEERS[aRoof].has(c) &&
              PEERS[bRoof].has(c)
            )
              eliminations.push({ cell: c, digit });
          }
          if (eliminations.length > 0)
            return {
              technique: 'skyscraper',
              placements: [],
              eliminations,
              patternCells: [...lineA.cells, ...lineB.cells],
            };
        }
      }
    }
  }
  return null;
};

// ============================================================
// TWO-STRING-KITE
// ============================================================
// For a single digit, find a row and a column that both have exactly 2 candidates,
// with one cell in the intersection box (shared box). The "kite" ends can eliminate
// cells that see both non-box endpoints.

const findTwoStringKite = (candidates: Candidates): HintResult | null => {
  for (let digit = 1; digit <= 9; digit++) {
    for (const col of COL_HOUSES) {
      const colCells = col.filter((c) => candidates[c].has(digit));
      if (colCells.length !== 2) continue;
      for (const row of ROW_HOUSES) {
        const rowCells = row.filter((c) => candidates[c].has(digit));
        if (rowCells.length !== 2) continue;
        // Find the intersection: one cell from colCells that shares a box with one cell from rowCells
        for (const colCell of colCells) {
          for (const rowCell of rowCells) {
            if (colCell === rowCell) continue;
            if (cellBox(colCell) !== cellBox(rowCell)) continue;
            // colCell and rowCell are in the same box — they are the "base" end
            // The other ends are the "roof" ends
            const colRoof = colCells.find((c) => c !== colCell)!;
            const rowRoof = rowCells.find((c) => c !== rowCell)!;
            if (colRoof === rowRoof) continue;
            // Cells that see both roof ends can have the digit eliminated
            const eliminations: Elimination[] = [];
            for (let c = 0; c < 81; c++) {
              if (c === colRoof || c === rowRoof) continue;
              if (
                candidates[c].has(digit) &&
                PEERS[colRoof].has(c) &&
                PEERS[rowRoof].has(c)
              )
                eliminations.push({ cell: c, digit });
            }
            if (eliminations.length > 0)
              return {
                technique: 'twoStringKite',
                placements: [],
                eliminations,
                patternCells: [colCell, rowCell, colRoof, rowRoof],
              };
          }
        }
      }
    }
  }
  return null;
};

// ============================================================
// EMPTY RECTANGLE
// ============================================================
// A digit in a box is restricted to a single row or column within that box (an ER).
// Combined with a conjugate pair (strong link) elsewhere, cells at the intersection
// can be eliminated.

export const findEmptyRectangle = (
  candidates: Candidates
): HintResult | null => {
  for (let digit = 1; digit <= 9; digit++) {
    for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
      const box = BOX_HOUSES[boxIdx];
      const boxCells = box.filter((c) => candidates[c].has(digit));
      if (boxCells.length < 2 || boxCells.length > 4) continue;

      const rows = new Set(boxCells.map(cellRow));
      const cols = new Set(boxCells.map(cellCol));

      // ER condition: all box candidates lie within one row OR one column
      // OR within the L-shape of one specific row + one specific column of this box.
      // For each valid (erRow, erCol) pair from the rows/cols present in the box,
      // check if all boxCells satisfy: cellRow(c) === erRow OR cellCol(c) === erCol.
      const erCandidates: Array<{ erRow: number; erCol: number }> = [];

      for (const erRow of rows) {
        for (const erCol of cols) {
          if (
            boxCells.every((c) => cellRow(c) === erRow || cellCol(c) === erCol)
          ) {
            erCandidates.push({ erRow, erCol });
          }
        }
      }

      for (const { erRow, erCol } of erCandidates) {
        // Case 1: use the ER to "project" along erRow via a column conjugate pair.
        // The ER means: if digit is not at pivot, it must be in erRow∩box.
        // But the ER also eliminates via the column part (erCol):
        // A conjugate pair in a COLUMN with pivot in erRow eliminates at (strongEnd's row, erCol).
        for (let col = 0; col < 9; col++) {
          const colCells = COL_HOUSES[col].filter((c) =>
            candidates[c].has(digit)
          );
          if (colCells.length !== 2) continue;
          const [ca, cb] = colCells;
          for (const [pivot, strongEnd] of [
            [ca, cb],
            [cb, ca],
          ]) {
            if (cellRow(pivot) !== erRow) continue;
            if (box.includes(pivot)) continue;
            if (box.includes(strongEnd)) continue;
            const targetRow = cellRow(strongEnd);
            const target = targetRow * 9 + erCol;
            if (box.includes(target)) continue;
            if (target === pivot || target === strongEnd) continue;
            if (!candidates[target].has(digit)) continue;
            return {
              technique: 'emptyRectangle',
              placements: [],
              eliminations: [{ cell: target, digit }],
              patternCells: [...boxCells, pivot, strongEnd],
            };
          }
        }

        // Case 2: use the ER to "project" along erCol via a row conjugate pair.
        // A conjugate pair in a ROW with pivot in erCol eliminates at (erRow, strongEnd's col).
        for (let row = 0; row < 9; row++) {
          const rowCells = ROW_HOUSES[row].filter((c) =>
            candidates[c].has(digit)
          );
          if (rowCells.length !== 2) continue;
          const [ca, cb] = rowCells;
          for (const [pivot, strongEnd] of [
            [ca, cb],
            [cb, ca],
          ]) {
            if (cellCol(pivot) !== erCol) continue;
            if (box.includes(pivot)) continue;
            if (box.includes(strongEnd)) continue;
            const targetCol = cellCol(strongEnd);
            const target = erRow * 9 + targetCol;
            if (box.includes(target)) continue;
            if (target === pivot || target === strongEnd) continue;
            if (!candidates[target].has(digit)) continue;
            return {
              technique: 'emptyRectangle',
              placements: [],
              eliminations: [{ cell: target, digit }],
              patternCells: [...boxCells, pivot, strongEnd],
            };
          }
        }
      }
    }
  }
  return null;
};

// ============================================================
// W-WING
// ============================================================
// Two bivalue cells with the same two candidates {A, B}, connected by a
// strong link on digit A (a house where A appears in only 2 cells, both of
// which see one of the bivalue cells). Digit B can be eliminated from cells
// that see both bivalue cells.

const findWWing = (candidates: Candidates): HintResult | null => {
  const bivalue = Array.from({ length: 81 }, (_, c) => c).filter(
    (c) => candidates[c].size === 2
  );

  for (let i = 0; i < bivalue.length - 1; i++) {
    for (let j = i + 1; j < bivalue.length; j++) {
      const c1 = bivalue[i];
      const c2 = bivalue[j];
      const cands1 = [...candidates[c1]];
      const cands2 = [...candidates[c2]];
      // Both must have the same two candidates
      if (cands1[0] !== cands2[0] || cands1[1] !== cands2[1]) continue;
      const [dA, dB] = cands1;

      // Try both digits as the "linking" digit (the strong-link digit)
      for (const linkDigit of [dA, dB]) {
        const elimDigit = linkDigit === dA ? dB : dA;
        // Find a house where linkDigit appears exactly 2 times,
        // one cell sees c1 and the other sees c2
        for (const house of HOUSES) {
          const linkCells = house.filter((c) => candidates[c].has(linkDigit));
          if (linkCells.length !== 2) continue;
          const [lc1, lc2] = linkCells;
          // One must see c1 and the other must see c2 (and they must not BE c1/c2)
          if (lc1 === c1 || lc1 === c2 || lc2 === c1 || lc2 === c2) continue;
          if (
            !(
              (PEERS[lc1].has(c1) && PEERS[lc2].has(c2)) ||
              (PEERS[lc1].has(c2) && PEERS[lc2].has(c1))
            )
          )
            continue;

          // Eliminate elimDigit from cells seeing both c1 and c2
          const eliminations: Elimination[] = [];
          for (let c = 0; c < 81; c++) {
            if (c === c1 || c === c2) continue;
            if (
              candidates[c].has(elimDigit) &&
              PEERS[c1].has(c) &&
              PEERS[c2].has(c)
            )
              eliminations.push({ cell: c, digit: elimDigit });
          }
          if (eliminations.length > 0)
            return {
              technique: 'wWing',
              placements: [],
              eliminations,
              patternCells: [c1, c2, lc1, lc2],
              patternDigits: [linkDigit],
            };
        }
      }
    }
  }
  return null;
};

const findYWing = (candidates: Candidates): HintResult | null => {
  const bivalue = Array.from({ length: 81 }, (_, c) => c).filter(
    (c) => candidates[c].size === 2
  );
  for (const pivot of bivalue) {
    const [a, b] = [...candidates[pivot]];
    const pincers = bivalue.filter(
      (c) =>
        c !== pivot &&
        PEERS[pivot].has(c) &&
        (candidates[c].has(a) || candidates[c].has(b))
    );
    for (const p1 of pincers) {
      for (const p2 of pincers) {
        if (p2 <= p1) continue;
        const p1other = [...candidates[p1]].find((d) => d !== a && d !== b);
        const p2other = [...candidates[p2]].find((d) => d !== a && d !== b);
        if (
          p1other === undefined ||
          p2other === undefined ||
          p1other !== p2other
        )
          continue;
        if (
          (candidates[p1].has(a) && candidates[p1].has(b)) ||
          (candidates[p2].has(a) && candidates[p2].has(b))
        )
          continue;
        if (candidates[p1].has(a) === candidates[p2].has(a)) continue;
        const elimDigit = p1other;
        const eliminations: Elimination[] = [];
        for (let c = 0; c < 81; c++) {
          if (c === pivot || c === p1 || c === p2) continue;
          if (
            PEERS[p1].has(c) &&
            PEERS[p2].has(c) &&
            candidates[c].has(elimDigit)
          )
            eliminations.push({ cell: c, digit: elimDigit });
        }
        if (eliminations.length > 0) {
          // Determine which pivot digit each pincer shares
          // p1 has one of {a,b} + elimDigit; p2 has the other + elimDigit
          const p1shared = candidates[p1].has(a) ? a : b;
          const p2shared = p1shared === a ? b : a;
          const chainPath: ChainNode[] = [
            { cell: p1, digit: elimDigit, isOn: false, linkToNext: 'strong' },
            { cell: p1, digit: p1shared, isOn: true, linkToNext: 'weak' },
            { cell: pivot, digit: p1shared, isOn: false, linkToNext: 'strong' },
            { cell: pivot, digit: p2shared, isOn: true, linkToNext: 'weak' },
            { cell: p2, digit: p2shared, isOn: false, linkToNext: 'strong' },
            { cell: p2, digit: elimDigit, isOn: true },
          ];
          return {
            technique: 'yWing',
            placements: [],
            eliminations,
            patternCells: [pivot, p1, p2],
            chainPath,
          };
        }
      }
    }
  }
  return null;
};

const findXYZWing = (candidates: Candidates): HintResult | null => {
  for (let pivot = 0; pivot < 81; pivot++) {
    if (candidates[pivot].size !== 3) continue;
    const [a, b, c] = [...candidates[pivot]];
    const eligiblePincers: number[] = [];
    for (const p of PEERS[pivot]) {
      if (
        candidates[p].size === 2 &&
        [...candidates[p]].every((d) => d === a || d === b || d === c)
      )
        eligiblePincers.push(p);
    }
    if (eligiblePincers.length < 2) continue;
    for (const p1 of eligiblePincers) {
      for (const p2 of eligiblePincers) {
        if (p2 <= p1) continue;
        // Each pincer has 2 of the 3 pivot digits.
        // Together they must cover all 3 pivot digits — meaning they must be missing
        // DIFFERENT digits from the pivot (otherwise one pivot digit is uncovered).
        const p1missing = [a, b, c].find((d) => !candidates[p1].has(d))!;
        const p2missing = [a, b, c].find((d) => !candidates[p2].has(d))!;
        if (p1missing === p2missing) continue;
        // The elimination digit is the one present in ALL THREE cells (the common digit Z)
        let elimDigit: number | null = null;
        for (const d of [a, b, c]) {
          if (
            candidates[pivot].has(d) &&
            candidates[p1].has(d) &&
            candidates[p2].has(d)
          ) {
            elimDigit = d;
            break;
          }
        }
        if (elimDigit === null) continue;
        const elim = elimDigit;
        const eliminations: Elimination[] = [];
        for (let cell = 0; cell < 81; cell++) {
          if (cell === pivot || cell === p1 || cell === p2) continue;
          if (
            PEERS[pivot].has(cell) &&
            PEERS[p1].has(cell) &&
            PEERS[p2].has(cell) &&
            candidates[cell].has(elim)
          )
            eliminations.push({ cell, digit: elim });
        }
        if (eliminations.length > 0) {
          // XYZ-Wing: pivot has {a,b,c}, p1 missing one digit, p2 missing a different one.
          // elim digit z is shared by all three.
          // Chain: (z)p1=(notZ1)p1-(notZ1)pivot=(notZ2)pivot-(notZ2)p2=(z)p2
          // where notZ1 = the digit p1 shares with pivot that is NOT z
          // and   notZ2 = the digit p2 shares with pivot that is NOT z
          const notZ1 = [...candidates[p1]].find((d) => d !== elim)!;
          const notZ2 = [...candidates[p2]].find((d) => d !== elim)!;
          const chainPath: ChainNode[] = [
            { cell: p1, digit: elim, isOn: false, linkToNext: 'strong' },
            { cell: p1, digit: notZ1, isOn: true, linkToNext: 'weak' },
            { cell: pivot, digit: notZ1, isOn: false, linkToNext: 'strong' },
            { cell: pivot, digit: notZ2, isOn: true, linkToNext: 'weak' },
            { cell: p2, digit: notZ2, isOn: false, linkToNext: 'strong' },
            { cell: p2, digit: elim, isOn: true },
          ];
          return {
            technique: 'xyzWing',
            placements: [],
            eliminations,
            patternCells: [pivot, p1, p2],
            chainPath,
          };
        }
      }
    }
  }
  return null;
};

// ============================================================
// UNIQUE RECTANGLE (Types 1-5)
// ============================================================
// A UR is a set of 4 cells forming a rectangle across exactly 2 rows and 2 cols,
// each pair of cells sharing a box. All 4 cells must share exactly 2 "floor" digits.
// Since a valid puzzle has a unique solution, the floor digits cannot be the only
// candidates in all 4 cells — so extra candidates in specific cells allow eliminations.

const buildURCells = (): number[][] => {
  // Returns all valid UR rectangles: [r1c1, r1c2, r2c1, r2c2]
  // where the 4 cells span exactly 2 rows, 2 cols, and 2 boxes
  const rects: number[][] = [];
  for (let r1 = 0; r1 < 9; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 9; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const cells = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
          // Must span exactly 2 boxes (otherwise it's a degenerate rectangle)
          const boxes = new Set(cells.map(cellBox));
          if (boxes.size === 2) rects.push(cells);
        }
      }
    }
  }
  return rects;
};

const UR_RECTS = buildURCells();

export const findUniqueRectangle = (
  grid: Grid,
  candidates: Candidates
): HintResult | null => {
  for (const [c0, c1, c2, c3] of UR_RECTS) {
    // All 4 must be unsolved
    if (grid[c0] !== 0 || grid[c1] !== 0 || grid[c2] !== 0 || grid[c3] !== 0)
      continue;

    const cands = [
      candidates[c0],
      candidates[c1],
      candidates[c2],
      candidates[c3],
    ];

    // Floor digits: digits present in all 4 cells
    const floor = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const s of cands)
      for (const d of floor) if (!s.has(d)) floor.delete(d);
    if (floor.size !== 2) continue;

    // Extra candidates per cell (beyond floor)
    const extras = cands.map((s) => [...s].filter((d) => !floor.has(d)));
    const cells = [c0, c1, c2, c3];

    // Type 1: exactly one cell has extras — eliminate floor digits from that cell
    for (let i = 0; i < 4; i++) {
      if (
        extras[i].length > 0 &&
        extras.filter((_, j) => j !== i && extras[j].length === 0).length === 3
      ) {
        const eliminations = [...floor].map((d) => ({
          cell: cells[i],
          digit: d,
        }));
        if (eliminations.length > 0)
          return {
            technique: 'uniqueRectangleType1',
            placements: [],
            eliminations,
            patternCells: cells,
            patternDigits: [...floor].sort((a, b) => a - b),
          };
      }
    }

    // Type 2: exactly 2 cells have exactly 1 extra digit (same digit), the other 2 cells
    // have ONLY the floor digits (no extras). Eliminate the extra digit from cells seeing both extra cells.
    const extraCells = cells.filter((_, i) => extras[i].length === 1);
    const floorOnlyCount = cells.filter(
      (_, i) => extras[i].length === 0
    ).length;
    if (extraCells.length === 2 && floorOnlyCount === 2) {
      const [ec0, ec1] = extraCells;
      const i0 = cells.indexOf(ec0),
        i1 = cells.indexOf(ec1);
      if (extras[i0][0] === extras[i1][0]) {
        const extraDigit = extras[i0][0];
        // Eliminate extraDigit from cells seeing both ec0 and ec1
        const eliminations: Elimination[] = [];
        for (let cell = 0; cell < 81; cell++) {
          if (cells.includes(cell)) continue;
          if (
            PEERS[ec0].has(cell) &&
            PEERS[ec1].has(cell) &&
            candidates[cell].has(extraDigit)
          )
            eliminations.push({ cell, digit: extraDigit });
        }
        if (eliminations.length > 0)
          return {
            technique: 'uniqueRectangleType2',
            placements: [],
            eliminations,
            patternCells: cells,
            patternDigits: [...floor].sort((a, b) => a - b),
          };
      }
    }

    // Type 3: exactly 2 cells have extras (the other 2 have only floor digits), share a house.
    // Treat their combined extras as a naked group within that house and eliminate those digits.
    if (extraCells.length === 2 && floorOnlyCount === 2) {
      const [ec0, ec1] = extraCells;
      const i0 = cells.indexOf(ec0),
        i1 = cells.indexOf(ec1);
      const combinedExtras = new Set([...extras[i0], ...extras[i1]]);
      const sharedHouses = HOUSES.filter(
        (h) => h.includes(ec0) && h.includes(ec1)
      );
      for (const house of sharedHouses) {
        const groupSize = combinedExtras.size;
        if (groupSize < 1 || groupSize > 4) continue;
        // Find other cells in house that together with ec0/ec1 form a naked group
        const otherCells = house.filter(
          (c) => !cells.includes(c) && candidates[c].size > 0
        );
        for (const extra of combinations(otherCells, groupSize - 1)) {
          const groupUnion = new Set(combinedExtras);
          for (const c of extra)
            for (const d of candidates[c]) groupUnion.add(d);
          if (groupUnion.size !== groupSize) continue;
          const groupCells = [ec0, ec1, ...extra];
          const eliminations: Elimination[] = [];
          for (const c of house) {
            if (groupCells.includes(c)) continue;
            for (const d of groupUnion)
              if (candidates[c].has(d))
                eliminations.push({ cell: c, digit: d });
          }
          if (eliminations.length > 0)
            return {
              technique: 'uniqueRectangleType3',
              placements: [],
              eliminations,
              patternCells: cells,
              patternDigits: [...floor].sort((a, b) => a - b),
            };
        }
      }
    }

    // Type 4: exactly 2 cells have extras (the other 2 have only floor digits), share a house,
    // and in that house one floor digit appears ONLY in the UR cells — so the other floor digit
    // can be eliminated from the 2 extra cells.
    if (extraCells.length === 2 && floorOnlyCount === 2) {
      const [ec0, ec1] = extraCells;
      // Find shared house
      const sharedHouses = HOUSES.filter(
        (h) => h.includes(ec0) && h.includes(ec1)
      );
      for (const house of sharedHouses) {
        for (const floorDigit of floor) {
          const otherFloorDigit = [...floor].find((d) => d !== floorDigit)!;
          // Check if floorDigit appears only in UR cells within this house
          const outsideCells = house.filter((c) => !cells.includes(c));
          if (outsideCells.every((c) => !candidates[c].has(floorDigit))) {
            // floorDigit is locked to UR cells in this house, so otherFloorDigit
            // must be eliminated from the 2 extra cells
            const eliminations = [ec0, ec1]
              .filter((c) => candidates[c].has(otherFloorDigit))
              .map((c) => ({ cell: c, digit: otherFloorDigit }));
            if (eliminations.length > 0)
              return {
                technique: 'uniqueRectangleType4',
                placements: [],
                eliminations,
                patternCells: cells,
                patternDigits: [...floor].sort((a, b) => a - b),
              };
          }
        }
      }
    }

    // Type 5: 3 cells have only the 2 floor digits. The 4th extra cell has candidates
    // that include floor digits — and we can use the diagonal visibility to eliminate.
    const floorOnlyCells = cells.filter((_, i) => extras[i].length === 0);
    if (floorOnlyCells.length === 3) {
      const extraCell = cells.find((_, i) => extras[i].length > 0)!;
      const extraIdx = cells.indexOf(extraCell);
      // For each floor digit, if it appears in the extra cell and can be seen from
      // the diagonally opposite floor-only cell via their shared peers, eliminate.
      const diagIdx = extraIdx < 2 ? extraIdx + 2 : extraIdx - 2;
      const diagCell = cells[diagIdx];
      for (const d of extras[extraIdx]) {
        const eliminations: Elimination[] = [];
        for (let cell = 0; cell < 81; cell++) {
          if (cells.includes(cell)) continue;
          if (
            PEERS[extraCell].has(cell) &&
            PEERS[diagCell].has(cell) &&
            candidates[cell].has(d)
          )
            eliminations.push({ cell, digit: d });
        }
        if (eliminations.length > 0)
          return {
            technique: 'uniqueRectangleType5',
            placements: [],
            eliminations,
            patternCells: cells,
          };
      }
    }
  }
  return null;
};

// ============================================================
// BUG+1 (Bivalue Universal Grave + 1)
// ============================================================
// If all unsolved cells are bivalue EXCEPT exactly one cell which has 3 candidates,
// and every candidate appears exactly twice in each house it belongs to except
// one candidate in the trivalue cell which appears 3 times — place the digit that
// appears 3 times in the trivalue cell.

const findBUG = (candidates: Candidates): HintResult | null => {
  let trivialCell = -1;
  let trivialDigit = -1;

  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size === 0) continue;
    if (candidates[cell].size > 3) return null;
    if (candidates[cell].size === 3) {
      if (trivialCell !== -1) return null; // more than one trivalue cell
      trivialCell = cell;
    }
  }
  if (trivialCell === -1) return null;

  // Check every house: all candidates appear exactly twice, except in the trivalue cell
  // Find which digit in the trivalue cell appears 3 times in at least one house
  for (const d of candidates[trivialCell]) {
    let valid = true;
    for (const house of HOUSES) {
      if (!house.includes(trivialCell)) continue;
      const count = house.filter((c) => candidates[c].has(d)).length;
      if (count !== 3) {
        valid = false;
        break;
      }
    }
    if (valid) {
      // Check all other cells are bivalue
      const allOthersBivalue = Array.from({ length: 81 }, (_, c) => c)
        .filter((c) => c !== trivialCell && candidates[c].size > 0)
        .every((c) => candidates[c].size === 2);
      if (allOthersBivalue) {
        trivialDigit = d;
        break;
      }
    }
  }

  if (trivialDigit === -1) return null;
  return {
    technique: 'bug',
    placements: [{ cell: trivialCell, digit: trivialDigit }],
    eliminations: [],
    patternCells: [trivialCell],
  };
};

// ============================================================
// XY-CHAIN
// ============================================================
// A chain through bivalue cells. Each link shares a common digit between
// adjacent cells. The first and last cells share a common digit (the elimination digit).
// Cells seeing both endpoints can have that digit eliminated.

const findXYChain = (candidates: Candidates): HintResult | null => {
  const bivalue = Array.from({ length: 81 }, (_, c) => c).filter(
    (c) => candidates[c].size === 2
  );

  // DFS through bivalue cells
  // Each step: current cell's "exit digit" (the digit that links to next cell)
  // Path alternates: enter via digit A, exit via digit B (the other candidate)

  for (const start of bivalue) {
    const [dA, dB] = [...candidates[start]];

    // Try starting with each exit digit
    for (const exitDigit of [dA, dB]) {
      const enterDigit = exitDigit === dA ? dB : dA;

      // DFS: path = list of cells, exits = exit digit at each step
      type State = {
        cell: number;
        exit: number;
        path: number[];
        exits: number[];
      };
      const stack: State[] = [
        { cell: start, exit: exitDigit, path: [start], exits: [exitDigit] },
      ];

      while (stack.length > 0) {
        const { cell, exit, path, exits } = stack.pop()!;

        // Find next bivalue cells that see this cell and have `exit` as a candidate
        for (const next of bivalue) {
          if (path.includes(next)) continue;
          if (!PEERS[cell].has(next)) continue;
          if (!candidates[next].has(exit)) continue;

          const nextCands = [...candidates[next]];
          const nextExit = nextCands.find((d) => d !== exit)!;
          const newPath = [...path, next];
          const newExits = [...exits, nextExit];

          // Check for eliminations: start enters with `enterDigit`, end exits with `nextExit`
          // If enterDigit === nextExit, cells seeing both start and end can lose this digit
          if (newPath.length >= 4 && enterDigit === nextExit) {
            const elimDigit = enterDigit;
            const eliminations: Elimination[] = [];
            for (let c = 0; c < 81; c++) {
              if (newPath.includes(c) || !candidates[c].has(elimDigit))
                continue;
              if (PEERS[start].has(c) && PEERS[next].has(c))
                eliminations.push({ cell: c, digit: elimDigit });
            }
            if (eliminations.length > 0) {
              // Build chainPath: each cell contributes two nodes (enter=OFF, exit=ON),
              // linked strong in-cell. Between cells the link is weak (same digit).
              // enterDigit at cell i = exit digit of cell i-1 (or `enterDigit` for start).
              const chainPath: ChainNode[] = [];
              for (let ci = 0; ci < newPath.length; ci++) {
                const c = newPath[ci];
                const cellEnter = ci === 0 ? enterDigit : newExits[ci - 1];
                const cellExit = newExits[ci];
                // enter node: isOn=false (weak link arrives here)
                chainPath.push({
                  cell: c,
                  digit: cellEnter,
                  isOn: false,
                  linkToNext: 'strong',
                });
                // exit node: isOn=true (strong link departs here)
                const isLast = ci === newPath.length - 1;
                chainPath.push({
                  cell: c,
                  digit: cellExit,
                  isOn: true,
                  linkToNext: isLast ? undefined : 'weak',
                });
              }
              return {
                technique: 'xyChain',
                placements: [],
                eliminations,
                patternCells: newPath,
                chainPath,
              };
            }
          }

          stack.push({
            cell: next,
            exit: nextExit,
            path: newPath,
            exits: newExits,
          });
        }
      }
    }
  }
  return null;
};

// ============================================================
// AIC (Alternating Inference Chain)
// ============================================================
// The general case: chains alternating weak and strong links.
// Nodes are (cell, digit) pairs. Strong links: a digit's conjugate pair in a house,
// or the two candidates of a bivalue cell. Weak links: two instances of the same
// digit that share a house, or two candidates within the same cell.
// An AIC starting and ending on strong links (both ends "ON") allows eliminating
// any digit visible to both ends.

export const findAIC = (
  candidates: Candidates,
  grid?: Grid
): HintResult | null => {
  // Node = cell * 9 + (digit - 1), encoding both cell and digit
  const encode = (cell: number, digit: number) => cell * 9 + (digit - 1);
  const decodeCell = (node: number) => Math.floor(node / 9);
  const decodeDigit = (node: number) => (node % 9) + 1;

  // Build strong links: (a) conjugate pairs per house, (b) bivalue cells
  const strongLinks = new Map<number, Set<number>>();
  const addStrong = (a: number, b: number) => {
    if (!strongLinks.has(a)) strongLinks.set(a, new Set());
    if (!strongLinks.has(b)) strongLinks.set(b, new Set());
    strongLinks.get(a)!.add(b);
    strongLinks.get(b)!.add(a);
  };

  for (const house of HOUSES) {
    for (let digit = 1; digit <= 9; digit++) {
      const cells = house.filter((c) => candidates[c].has(digit));
      if (cells.length === 2)
        addStrong(encode(cells[0], digit), encode(cells[1], digit));
    }
  }
  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size === 2) {
      const [d1, d2] = [...candidates[cell]];
      addStrong(encode(cell, d1), encode(cell, d2));
    }
  }

  // Weak links: same digit in shared house, or same cell different digit
  const weakNeighbors = (node: number): number[] => {
    const cell = decodeCell(node);
    const digit = decodeDigit(node);
    const result: number[] = [];
    for (const peer of PEERS[cell]) {
      if (candidates[peer].has(digit)) result.push(encode(peer, digit));
    }
    for (const d of candidates[cell]) {
      if (d !== digit) result.push(encode(cell, d));
    }
    return result;
  };

  // Build all active nodes
  const allNodes: number[] = [];
  for (let cell = 0; cell < 81; cell++) {
    for (const digit of candidates[cell]) allNodes.push(encode(cell, digit));
  }

  const MAX_CHAIN = 12;

  // --- Pass 1: isOn=true start ---
  // Proves: start=ON → end=ON.
  // Used for:
  //   (a) AIC Ring: ring detected, valid for any weak-link pair eliminations
  //   (b) Same-cell contradiction: start and end in same cell with different digits
  for (const startNode of allNodes) {
    if (!strongLinks.has(startNode)) continue;

    type State = { node: number; isOn: boolean; path: number[] };
    const queue: State[] = [{ node: startNode, isOn: true, path: [startNode] }];

    while (queue.length > 0) {
      const { node, isOn, path } = queue.shift()!;
      if (path.length > MAX_CHAIN) continue;

      const next_nodes = isOn
        ? weakNeighbors(node)
        : [...(strongLinks.get(node) ?? [])];

      for (const next of next_nodes) {
        if (path.includes(next)) continue;
        const newPath = [...path, next];

        if (!isOn && newPath.length >= 4) {
          // Ring check first: if `next` has a weak link back to `startNode`
          // (both ON), the chain closes into a ring. In a ring every weak link
          // has exactly one ON endpoint, so we can eliminate any candidate that
          // sees both endpoints of any weak link (including the closing link).
          const closingWeakLink = weakNeighbors(next).includes(startNode);
          if (closingWeakLink) {
            // newPath = [start(ON), off, on, off, ..., next(ON)]
            // Chain weak links are at (ON,OFF) index pairs: (0,1),(2,3),...
            // Each weak link pair (A=ON, B=OFF) means in either coloring exactly
            // one of A or B has digit d. External cells seeing both can eliminate d.
            // The closing link (next(ON)→start(ON)) is NOT included for external
            // eliminations: in the valid coloring both are OFF, so no guarantee.
            //
            // Validity check: no two ON nodes (other than the closing pair
            // next↔startNode) may be weak-link neighbors. If they were, one
            // coloring would have two ON peers sharing the same digit in a house,
            // making that coloring impossible and invalidating the ring logic.
            //
            // The closing pair (startNode, next) are both ON. If they share a
            // house with the same digit (closingIsSameDigitPeer), Color A places
            // the same digit in two cells of the same house — Color A is impossible
            // and only Color B holds (a discontinuous loop). We still allow this
            // ring to produce eliminations, but require propagateDeep validation
            // for each elimination because the "either coloring" guarantee is lost.
            // const closingCell1 = decodeCell(startNode);
            // const closingCell2 = decodeCell(next);
            // const closingDigit1 = decodeDigit(startNode);
            // const closingDigit2 = decodeDigit(next);
            // const closingIsSameDigitPeer =
            //   closingDigit1 === closingDigit2 &&
            //   closingCell1 !== closingCell2 &&
            //   PEERS[closingCell1].has(closingCell2);

            const onNodes = newPath.filter((_, i) => i % 2 === 0);
            const offNodes = newPath.filter((_, i) => i % 2 === 1);
            const hasWeakConflict = (
              nodes: number[],
              allowedPair: string | null
            ): boolean =>
              nodes.some((a, i) =>
                nodes.slice(i + 1).some((b) => {
                  const pairKey = `${Math.min(a, b)},${Math.max(a, b)}`;
                  if (allowedPair === pairKey) return false;
                  return weakNeighbors(a).includes(b);
                })
              );
            const allowedOnPair = `${Math.min(startNode, next)},${Math.max(startNode, next)}`;
            const ringIsValid = !hasWeakConflict(onNodes, allowedOnPair);
            if (!ringIsValid) continue;

            const weakLinks: [number, number][] = [];
            for (let i = 0; i < newPath.length - 1; i += 2) {
              weakLinks.push([newPath[i], newPath[i + 1]]);
            }

            const eliminations: Elimination[] = [];
            const pathCells = new Set(newPath.map(decodeCell));
            const offDigitConflict = (digit: number): boolean =>
              hasWeakConflict(
                offNodes.filter((node) => decodeDigit(node) === digit),
                null
              );

            for (const [onNode, offNode] of weakLinks) {
              const onCell = decodeCell(onNode);
              const onDigit = decodeDigit(onNode);
              const offCell = decodeCell(offNode);
              const offDigit = decodeDigit(offNode);

              if (onDigit === offDigit) {
                const d = onDigit;
                if (offDigitConflict(d)) continue;
                for (let c = 0; c < 81; c++) {
                  if (pathCells.has(c)) continue;
                  if (
                    candidates[c].has(d) &&
                    PEERS[onCell].has(c) &&
                    PEERS[offCell].has(c)
                  )
                    eliminations.push({ cell: c, digit: d });
                }
              }
            }

            const seen = new Set<string>();
            const unique = eliminations.filter((e) => {
              const key = `${e.cell},${e.digit}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            // const hasInCellWeakLink = weakLinks.some(
            //   ([a, b]) => decodeCell(a) === decodeCell(b)
            // );
            // Validate eliminations when the ring's "either coloring" guarantee
            // is weakened: in-cell weak links or a same-digit-peer closing link
            // mean Color A is self-contradictory (only Color B holds). In those
            // cases each elimination must be independently verified via
            // propagateDeep to ensure it truly leads to a contradiction.
            const shouldValidate = grid !== undefined;
            const validated = !shouldValidate
              ? unique
              : unique.filter(
                  ({ cell, digit }) =>
                    propagateDeep(cell, digit, grid, candidates) === null
                );

            if (validated.length > 0) {
              const chainPath: ChainNode[] = newPath.map((n, i) => {
                const isOn = i % 2 === 0;
                return {
                  cell: decodeCell(n),
                  digit: decodeDigit(n),
                  isOn,
                  linkToNext:
                    i < newPath.length - 1
                      ? isOn
                        ? 'weak'
                        : 'strong'
                      : 'weak',
                };
              });
              return {
                technique: 'aicRing',
                placements: [],
                eliminations: validated,
                patternCells: [
                  ...new Set([...newPath, startNode].map(decodeCell)),
                ],
                chainPath,
              };
            }
          }

          // Same-cell contradiction: both ends ON, same cell, different digits
          // → the start digit is impossible (both can't hold simultaneously)
          const startCell = decodeCell(startNode);
          const startDigit = decodeDigit(startNode);
          const endCell = decodeCell(next);
          const eliminations: Elimination[] = [];

          if (startCell === endCell) {
            if (candidates[startCell].has(startDigit))
              eliminations.push({ cell: startCell, digit: startDigit });
          }

          if (eliminations.length > 0) {
            const chainPath: ChainNode[] = newPath.map((n, i) => {
              const isOn = i % 2 === 0;
              return {
                cell: decodeCell(n),
                digit: decodeDigit(n),
                isOn,
                linkToNext:
                  i < newPath.length - 1
                    ? isOn
                      ? 'weak'
                      : 'strong'
                    : undefined,
              };
            });
            return {
              technique: 'aic',
              placements: [],
              eliminations,
              patternCells: [...new Set(newPath.map(decodeCell))],
              chainPath,
            };
          }
        }

        queue.push({ node: next, isOn: !isOn, path: newPath });
      }
    }
  }

  // --- Pass 2: isOn=false start ---
  // Proves: start=OFF → end=ON.
  // Used for same-digit elimination: cell c sees both start and end with digit d.
  //   - If start=ON (has d): c is in same house as start → c can't have d ✓
  //   - If start=OFF: end=ON (has d): c is in same house as end → c can't have d ✓
  // The minimum meaningful chain length is 4 nodes:
  //   start(OFF) →strong→ n1(ON) →weak→ n2(OFF) →strong→ end(ON)
  // The check fires when we add a node to an OFF state (taking a strong link),
  // arriving at the new ON end, with newPath.length >= 4.
  for (const startNode of allNodes) {
    if (!strongLinks.has(startNode)) continue;

    type State = { node: number; isOn: boolean; path: number[] };
    const queue: State[] = [
      { node: startNode, isOn: false, path: [startNode] },
    ];

    while (queue.length > 0) {
      const { node, isOn, path } = queue.shift()!;
      if (path.length > MAX_CHAIN) continue;

      const next_nodes = isOn
        ? weakNeighbors(node)
        : [...(strongLinks.get(node) ?? [])];

      for (const next of next_nodes) {
        if (path.includes(next)) continue;
        const newPath = [...path, next];

        if (!isOn && newPath.length >= 4) {
          const startCell = decodeCell(startNode);
          const startDigit = decodeDigit(startNode);
          const endCell = decodeCell(next);
          const endDigit = decodeDigit(next);
          const eliminations: Elimination[] = [];

          if (startDigit === endDigit) {
            const d = startDigit;
            for (let c = 0; c < 81; c++) {
              if (newPath.some((n) => decodeCell(n) === c)) continue;
              if (
                candidates[c].has(d) &&
                PEERS[startCell].has(c) &&
                PEERS[endCell].has(c)
              )
                eliminations.push({ cell: c, digit: d });
            }
          }

          if (eliminations.length > 0) {
            // Pass 2 starts OFF, so node i isOn = i % 2 !== 0
            const chainPath: ChainNode[] = newPath.map((n, i) => {
              const isOn = i % 2 !== 0;
              return {
                cell: decodeCell(n),
                digit: decodeDigit(n),
                isOn,
                linkToNext:
                  i < newPath.length - 1
                    ? isOn
                      ? 'weak'
                      : 'strong'
                    : undefined,
              };
            });
            return {
              technique: 'aic',
              placements: [],
              eliminations,
              patternCells: [...new Set(newPath.map(decodeCell))],
              chainPath,
            };
          }
        }

        queue.push({ node: next, isOn: !isOn, path: newPath });
      }
    }
  }

  return null;
};

// ============================================================
// GROUPED AIC
// ============================================================
// Like AIC, but nodes can be groups of cells within a box+line intersection.
// Group strong links: a group is the only node covering a house for a digit.
// Group weak links: all cells in the group see all cells in another node.

export const findGroupedAIC = (
  candidates: Candidates,
  grid?: Grid
): HintResult | null => {
  // Build group nodes: (cell,digit) pairs + group nodes for box-row/col intersections
  // A group node covers multiple cells for a single digit.

  type NodeDef =
    | { type: 'cell'; cell: number; digit: number; id: number }
    | { type: 'group'; cells: number[]; digit: number; id: number };

  const nodes: NodeDef[] = [];
  const nodeById = new Map<number, NodeDef>();
  let nextId = 0;

  // Cell nodes
  for (let cell = 0; cell < 81; cell++) {
    for (const digit of candidates[cell]) {
      const id = nextId++;
      const nd: NodeDef = { type: 'cell', cell, digit, id };
      nodes.push(nd);
      nodeById.set(id, nd);
    }
  }

  // Group nodes: box-row and box-col intersections with 2+ candidates
  const groupNodes: NodeDef[] = [];
  for (const box of BOX_HOUSES) {
    for (let digit = 1; digit <= 9; digit++) {
      const boxCells = box.filter((c) => candidates[c].has(digit));
      if (boxCells.length < 2) continue;
      const byRow = new Map<number, number[]>();
      const byCol = new Map<number, number[]>();
      for (const c of boxCells) {
        const r = cellRow(c);
        const col = cellCol(c);
        if (!byRow.has(r)) byRow.set(r, []);
        if (!byCol.has(col)) byCol.set(col, []);
        byRow.get(r)!.push(c);
        byCol.get(col)!.push(c);
      }
      for (const [, cells] of [...byRow, ...byCol]) {
        if (cells.length < 2) continue;
        const id = nextId++;
        const nd: NodeDef = { type: 'group', cells, digit, id };
        groupNodes.push(nd);
        nodeById.set(id, nd);
      }
    }
  }
  const allNodes = [...nodes, ...groupNodes];

  // Build strong links: for each house, find pairs of non-overlapping nodes
  // (cell or group) that together cover ALL cells with the digit in that house
  const strongLinks = new Map<number, Set<number>>();
  const addStrong = (a: number, b: number) => {
    if (!strongLinks.has(a)) strongLinks.set(a, new Set());
    if (!strongLinks.has(b)) strongLinks.set(b, new Set());
    strongLinks.get(a)!.add(b);
    strongLinks.get(b)!.add(a);
  };

  for (const house of HOUSES) {
    for (let digit = 1; digit <= 9; digit++) {
      const houseCells = new Set(house.filter((c) => candidates[c].has(digit)));
      if (houseCells.size < 2) continue;
      const houseNodes = allNodes.filter((nd) => {
        if (nd.digit !== digit) return false;
        const ndCells = nd.type === 'cell' ? [nd.cell] : nd.cells;
        return ndCells.every((c) => houseCells.has(c));
      });
      for (let i = 0; i < houseNodes.length - 1; i++) {
        for (let j = i + 1; j < houseNodes.length; j++) {
          const ni = houseNodes[i];
          const nj = houseNodes[j];
          const niCells = ni.type === 'cell' ? [ni.cell] : ni.cells;
          const njCells = nj.type === 'cell' ? [nj.cell] : nj.cells;
          if (niCells.some((c) => njCells.includes(c))) continue;
          const covered = new Set([...niCells, ...njCells]);
          if ([...houseCells].every((c) => covered.has(c)))
            addStrong(ni.id, nj.id);
        }
      }
    }
  }

  // Bivalue strong links
  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size !== 2) continue;
    const [d1, d2] = [...candidates[cell]];
    const n1 = nodes.find(
      (n) => n.type === 'cell' && n.cell === cell && n.digit === d1
    );
    const n2 = nodes.find(
      (n) => n.type === 'cell' && n.cell === cell && n.digit === d2
    );
    if (n1 && n2) addStrong(n1.id, n2.id);
  }

  // Weak neighbors: nodes sharing a house (all cells see all cells of other node)
  const weakNeighbors = (nodeId: number): number[] => {
    const nd = nodeById.get(nodeId)!;
    const ndCells = nd.type === 'cell' ? [nd.cell] : nd.cells;
    const result: number[] = [];
    for (const other of allNodes) {
      if (other.id === nodeId || other.digit !== nd.digit) continue;
      const otherCells = other.type === 'cell' ? [other.cell] : other.cells;
      const seesAll = ndCells.every((c1) =>
        otherCells.every((c2) => c1 !== c2 && PEERS[c1].has(c2))
      );
      if (seesAll) result.push(other.id);
    }
    // Bivalue cell: same cell, different digit
    if (nd.type === 'cell') {
      for (const other of nodes) {
        if (other.type !== 'cell') continue;
        if (other.cell === nd.cell && other.digit !== nd.digit)
          result.push(other.id);
      }
    }
    return result;
  };

  const nodeCells = (id: number): number[] => {
    const nd = nodeById.get(id)!;
    return nd.type === 'cell' ? [nd.cell] : nd.cells;
  };

  const MAX_CHAIN = 12;

  const buildGroupedChainPath = (
    path: number[],
    startsOn: boolean
  ): ChainNode[] =>
    path.map((id, i) => {
      const nd = nodeById.get(id)!;
      const isOn = startsOn ? i % 2 === 0 : i % 2 !== 0;
      return {
        cell: nd.type === 'cell' ? nd.cell : nd.cells[0],
        digit: nd.digit,
        isOn,
        cells: nd.type === 'group' ? nd.cells : undefined,
        linkToNext:
          i < path.length - 1 ? (isOn ? 'weak' : 'strong') : undefined,
      };
    });

  // Cells already visited in the path for a given digit (prevents a group node
  // from sharing cells with a same-digit node already in the chain, which would
  // create an invalid coloring where the same candidate is both ON and OFF).
  const cellsInPathByDigit = (path: number[]): Map<number, Set<number>> => {
    const m = new Map<number, Set<number>>();
    for (const id of path) {
      const nd = nodeById.get(id)!;
      if (!m.has(nd.digit)) m.set(nd.digit, new Set());
      for (const c of nodeCells(id)) m.get(nd.digit)!.add(c);
    }
    return m;
  };

  const wouldOverlapSameDigit = (path: number[], next: number): boolean => {
    const nd = nodeById.get(next)!;
    const usedCells = cellsInPathByDigit(path).get(nd.digit);
    if (!usedCells) return false;
    return nodeCells(next).some((c) => usedCells.has(c));
  };

  // --- Pass 1: isOn=true start ---
  // Proves: start=ON → end=ON.
  // Used for:
  //   (a) Grouped AIC Ring: ring detected via weak link back to start
  //   (b) Same-cell contradiction: both ends ON in same cell with different digits
  for (const startNode of allNodes) {
    if (!strongLinks.has(startNode.id)) continue;

    type State = { id: number; isOn: boolean; path: number[] };
    const queue: State[] = [
      { id: startNode.id, isOn: true, path: [startNode.id] },
    ];

    while (queue.length > 0) {
      const { id, isOn, path } = queue.shift()!;
      if (path.length > MAX_CHAIN) continue;

      const nextIds = isOn
        ? weakNeighbors(id)
        : [...(strongLinks.get(id) ?? [])];

      for (const next of nextIds) {
        if (path.includes(next)) continue;
        if (wouldOverlapSameDigit(path, next)) continue;
        const newPath = [...path, next];

        if (!isOn && newPath.length >= 4) {
          // Ring check: if `next` has a weak link back to `startNode`
          // (both ON), the chain closes into a ring.
          const closingWeakLink = weakNeighbors(next).includes(startNode.id);
          if (closingWeakLink) {
            const startNd = nodeById.get(startNode.id)!;
            const endNd = nodeById.get(next)!;
            const closingIsSameDigitPeer = startNd.digit === endNd.digit;

            // Validity check: no two ON nodes (other than the closing pair
            // next↔startNode) may be weak-link neighbors. If they were, one
            // coloring would have two ON peers sharing the same digit in a house,
            // making that coloring impossible and invalidating the ring logic.
            const onNodes = newPath.filter((_, i) => i % 2 === 0);
            const allowedOnPair = `${Math.min(startNode.id, next)},${Math.max(startNode.id, next)}`;
            const hasWeakConflict = (nodes: number[]): boolean =>
              nodes.some((a, i) =>
                nodes.slice(i + 1).some((b) => {
                  const pairKey = `${Math.min(a, b)},${Math.max(a, b)}`;
                  if (allowedOnPair === pairKey) return false;
                  return weakNeighbors(a).includes(b);
                })
              );
            if (hasWeakConflict(onNodes)) continue;

            // Every weak link pair (A=ON, B=OFF) in the ring: any external cell
            // seeing all cells of A and all cells of B can eliminate digit A/B.
            const weakLinks: [number, number][] = [];
            for (let i = 0; i < newPath.length - 1; i += 2) {
              weakLinks.push([newPath[i], newPath[i + 1]]);
            }

            const eliminations: Elimination[] = [];
            const pathCells = new Set(newPath.flatMap(nodeCells));

            for (const [onId, offId] of weakLinks) {
              const onNd = nodeById.get(onId)!;
              const offNd = nodeById.get(offId)!;
              if (onNd.digit !== offNd.digit) continue;
              const d = onNd.digit;
              const onCs = nodeCells(onId);
              const offCs = nodeCells(offId);
              for (let c = 0; c < 81; c++) {
                if (pathCells.has(c)) continue;
                if (
                  candidates[c].has(d) &&
                  onCs.every((oc) => PEERS[oc].has(c)) &&
                  offCs.every((oc) => PEERS[oc].has(c))
                )
                  eliminations.push({ cell: c, digit: d });
              }
            }

            const seen = new Set<string>();
            const unique = eliminations.filter((e) => {
              const key = `${e.cell},${e.digit}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

            const closingIsInCell =
              startNd.type === 'cell' &&
              endNd.type === 'cell' &&
              startNd.cell === endNd.cell;
            const hasInCellWeakLink =
              closingIsInCell ||
              weakLinks.some(([onId, offId]) => {
                const onNd = nodeById.get(onId)!;
                const offNd = nodeById.get(offId)!;
                return (
                  onNd.type === 'cell' &&
                  offNd.type === 'cell' &&
                  onNd.cell === offNd.cell
                );
              });
            const shouldValidate =
              (hasInCellWeakLink || closingIsSameDigitPeer) &&
              grid !== undefined;
            if ((hasInCellWeakLink || closingIsSameDigitPeer) && !grid)
              continue;
            const validated = !shouldValidate
              ? unique
              : unique.filter(
                  ({ cell, digit }) =>
                    propagateDeep(cell, digit, grid, candidates) === null
                );

            if (validated.length > 0) {
              const chainPath = buildGroupedChainPath(newPath, true);
              if (chainPath.length > 0)
                chainPath[chainPath.length - 1].linkToNext = 'weak';
              return {
                technique: 'groupedAIC',
                placements: [],
                eliminations: validated,
                patternCells: [
                  ...new Set([...newPath, startNode.id].flatMap(nodeCells)),
                ],
                chainPath,
              };
            }
          }

          // Same-cell contradiction: start and end are cell nodes, same cell,
          // different digits → start digit is impossible
          const startNd = nodeById.get(startNode.id)!;
          const endNd = nodeById.get(next)!;
          if (
            startNd.type === 'cell' &&
            endNd.type === 'cell' &&
            startNd.cell === endNd.cell &&
            startNd.digit !== endNd.digit
          ) {
            if (candidates[startNd.cell].has(startNd.digit))
              return {
                technique: 'groupedAIC',
                placements: [],
                eliminations: [{ cell: startNd.cell, digit: startNd.digit }],
                patternCells: [...new Set(newPath.flatMap(nodeCells))],
                chainPath: buildGroupedChainPath(newPath, true),
              };
          }
        }

        queue.push({ id: next, isOn: !isOn, path: newPath });
      }
    }
  }

  // --- Pass 2: isOn=false start ---
  // Proves: start=OFF → end=ON (same digit).
  // Any external cell seeing all cells of start and all cells of end can eliminate that digit.
  for (const startNode of allNodes) {
    if (!strongLinks.has(startNode.id)) continue;

    type State = { id: number; isOn: boolean; path: number[] };
    const queue: State[] = [
      { id: startNode.id, isOn: false, path: [startNode.id] },
    ];

    while (queue.length > 0) {
      const { id, isOn, path } = queue.shift()!;
      if (path.length > MAX_CHAIN) continue;

      const nextIds = isOn
        ? weakNeighbors(id)
        : [...(strongLinks.get(id) ?? [])];

      for (const next of nextIds) {
        if (path.includes(next)) continue;
        if (wouldOverlapSameDigit(path, next)) continue;
        const newPath = [...path, next];

        if (!isOn && newPath.length >= 4) {
          const startNd = nodeById.get(startNode.id)!;
          const endNd = nodeById.get(next)!;
          if (startNd.digit === endNd.digit) {
            const d = startNd.digit;
            const startCs = nodeCells(startNode.id);
            const endCs = nodeCells(next);
            const eliminations: Elimination[] = [];
            const pathCells = new Set(newPath.flatMap(nodeCells));
            for (let c = 0; c < 81; c++) {
              if (pathCells.has(c)) continue;
              if (
                candidates[c].has(d) &&
                startCs.every((sc) => PEERS[sc].has(c)) &&
                endCs.every((ec) => PEERS[ec].has(c))
              )
                eliminations.push({ cell: c, digit: d });
            }
            if (eliminations.length > 0) {
              return {
                technique: 'groupedAIC',
                placements: [],
                eliminations,
                patternCells: [...new Set(newPath.flatMap(nodeCells))],
                chainPath: buildGroupedChainPath(newPath, false),
              };
            }
          }
        }

        queue.push({ id: next, isOn: !isOn, path: newPath });
      }
    }
  }

  return null;
};

// ============================================================
// NISHIO / FORCING CHAIN
// ============================================================
// Assume a candidate is true and propagate. If it leads to a contradiction
// in any house (no cells left for a digit), the candidate must be false.
// This is a last resort before trial-and-error.

const propagate = (
  cell: number,
  digit: number,
  gridIn: Grid,
  candsIn: Candidates
): { grid: Grid; candidates: Candidates } | null => {
  const grid = [...gridIn];
  const cands = candsIn.map((s) => new Set(s));

  const queue: [number, number][] = [[cell, digit]];
  while (queue.length > 0) {
    const [c, d] = queue.shift()!;
    if (grid[c] !== 0) {
      if (grid[c] !== d) return null; // contradiction
      continue;
    }
    if (!cands[c].has(d)) return null; // contradiction
    grid[c] = d;
    cands[c] = new Set();
    for (const peer of PEERS[c]) {
      if (grid[peer] !== 0) continue;
      cands[peer].delete(d);
      if (cands[peer].size === 0) return null; // naked single contradiction
      if (cands[peer].size === 1) queue.push([peer, [...cands[peer]][0]]);
    }
    // Check house constraints
    for (const house of HOUSES) {
      if (!house.includes(c)) continue;
      for (let hd = 1; hd <= 9; hd++) {
        const cells = house.filter((hc) => grid[hc] === 0 && cands[hc].has(hd));
        if (cells.length === 0 && !house.some((hc) => grid[hc] === hd))
          return null;
        if (cells.length === 1 && grid[cells[0]] === 0)
          queue.push([cells[0], hd]);
      }
    }
  }
  return { grid, candidates: cands };
};

// propagateDeep extends propagate() with locked candidates and naked/hidden
// pairs applied iteratively until no further progress is made. This allows
// forcing chain functions to detect deeper contradictions and forced placements
// that only become visible after applying these intermediate techniques.
const propagateDeep = (
  cell: number,
  digit: number,
  gridIn: Grid,
  candsIn: Candidates
): { grid: Grid; candidates: Candidates } | null => {
  const base = propagate(cell, digit, gridIn, candsIn);
  if (base === null) return null;

  let { grid, candidates } = base;

  // Iteratively apply locked candidates and pairs until stable
  for (;;) {
    let changed = false;

    // Apply locked candidates
    const lockedHint =
      findLockedCandidates(candidates) ??
      findNakedGroup(candidates, 2) ??
      findHiddenGroup(candidates, 2);

    if (lockedHint !== null) {
      // Apply eliminations from this hint
      const newCands = candidates.map((s) => new Set(s));
      for (const { cell: c, digit: d } of lockedHint.eliminations) {
        newCands[c].delete(d);
        if (newCands[c].size === 0 && grid[c] === 0) return null;
      }
      // Check for newly forced naked singles and propagate them
      const forced: [number, number][] = [];
      for (let c = 0; c < 81; c++) {
        if (grid[c] === 0 && newCands[c].size === 1) {
          forced.push([c, [...newCands[c]][0]]);
        }
      }
      if (forced.length > 0 || lockedHint.eliminations.length > 0) {
        changed = true;
        candidates = newCands;
        for (const [fc, fd] of forced) {
          if (grid[fc] !== 0) continue;
          const r = propagate(fc, fd, grid, candidates);
          if (r === null) return null;
          grid = r.grid;
          candidates = r.candidates;
        }
      }
    }

    if (!changed) break;
  }

  return { grid, candidates };
};

export const findNishio = (
  grid: Grid,
  candidates: Candidates
): HintResult | null => {
  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size === 0) continue;
    for (const digit of candidates[cell]) {
      const result = propagateDeep(cell, digit, grid, candidates);
      if (result === null) {
        // Assuming digit at cell leads to contradiction → eliminate it
        return {
          technique: 'nishio',
          placements: [],
          eliminations: [{ cell, digit }],
          patternCells: [cell],
        };
      }
    }
  }
  return null;
};

// ============================================================
// NISHIO FORCING NET
// ============================================================
// Like Nishio but uses full propagation including hidden singles in houses
// (a "net" rather than a "chain"). Tries all candidates for all unsolved cells;
// if assuming a candidate and fully propagating (including all naked/hidden single
// cascades) leads to a contradiction, that candidate is false.
// Our existing propagate() already does this, so findNishioNet is the same as
// findNishio but with broader candidate enumeration (not limited to already-tried).

export const findNishioNet = (
  grid: Grid,
  candidates: Candidates
): HintResult | null => {
  // Try all cells, not just obvious ones — same logic as Nishio
  // but we also check for hidden singles in the propagation tree.
  // Our propagate() already cascades hidden singles, so this is equivalent.
  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size < 2) continue;
    for (const digit of candidates[cell]) {
      const result = propagateDeep(cell, digit, grid, candidates);
      if (result === null)
        return {
          technique: 'nishioNet',
          placements: [],
          eliminations: [{ cell, digit }],
          patternCells: [cell],
        };
    }
  }
  return null;
};

// ============================================================
// CELL / REGION FORCING CHAIN
// ============================================================
// Cell Forcing Chain: try every candidate of a cell. If all branches force
// the same value in another cell → that value can be placed.
// If all branches eliminate a candidate from another cell → that candidate is false.
// Region Forcing Chain: for each digit in a house, try placing it in each possible
// cell. If all placements force the same consequence → that consequence holds.

export const findCellRegionForcingChain = (
  grid: Grid,
  candidates: Candidates
): HintResult | null => {
  // Cell forcing chain
  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size < 2) continue;
    const branches: ({ grid: Grid; candidates: Candidates } | null)[] = [];
    for (const digit of candidates[cell]) {
      branches.push(propagateDeep(cell, digit, grid, candidates));
    }
    if (branches.some((b) => b === null)) continue;
    const validBranches = branches as { grid: Grid; candidates: Candidates }[];

    // Find placements forced in all branches
    for (let c = 0; c < 81; c++) {
      if (grid[c] !== 0) continue;
      const allSame = validBranches.every(
        (b) => b.grid[c] !== 0 && b.grid[c] === validBranches[0].grid[c]
      );
      if (allSame && validBranches[0].grid[c] !== 0)
        return {
          technique: 'cellRegionForcingChain',
          placements: [{ cell: c, digit: validBranches[0].grid[c] }],
          eliminations: [],
          patternCells: [cell, c],
        };
      // Eliminations: digit removed in all branches
      for (const digit of candidates[c]) {
        const allElim = validBranches.every((b) => !b.candidates[c].has(digit));
        if (allElim)
          return {
            technique: 'cellRegionForcingChain',
            placements: [],
            eliminations: [{ cell: c, digit }],
            patternCells: [cell, c],
          };
      }
    }
  }

  // Region forcing chain: for each house, try all positions of each digit
  for (const house of HOUSES) {
    for (let digit = 1; digit <= 9; digit++) {
      const cells = house.filter((c) => candidates[c].has(digit));
      if (cells.length < 2) continue;
      const branches = cells.map((c) =>
        propagateDeep(c, digit, grid, candidates)
      );
      if (branches.some((b) => b === null)) continue;
      const validBranches = branches as {
        grid: Grid;
        candidates: Candidates;
      }[];

      for (let c = 0; c < 81; c++) {
        if (grid[c] !== 0) continue;
        const allSame = validBranches.every(
          (b) => b.grid[c] !== 0 && b.grid[c] === validBranches[0].grid[c]
        );
        if (allSame && validBranches[0].grid[c] !== 0)
          return {
            technique: 'cellRegionForcingChain',
            placements: [{ cell: c, digit: validBranches[0].grid[c] }],
            eliminations: [],
            patternCells: [...cells, c],
          };
        for (const d of candidates[c]) {
          const allElim = validBranches.every((b) => !b.candidates[c].has(d));
          if (allElim)
            return {
              technique: 'cellRegionForcingChain',
              placements: [],
              eliminations: [{ cell: c, digit: d }],
              patternCells: [...cells, c],
            };
        }
      }
    }
  }
  return null;
};

// ============================================================
// CELL / REGION FORCING NET
// ============================================================
// Same as Cell/Region Forcing Chain but uses full propagation nets.
// Our propagate() already does full net propagation, so this is identical
// in implementation to findCellRegionForcingChain but uses a larger breadth
// of starting cells (multi-valued cells too).

export const findCellRegionForcingNet = (
  grid: Grid,
  candidates: Candidates
): HintResult | null => {
  // Try cells with 3+ candidates (beyond bivalue which forcingChain already handles)
  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size < 3) continue;
    const branches: ({ grid: Grid; candidates: Candidates } | null)[] = [];
    for (const digit of candidates[cell]) {
      branches.push(propagateDeep(cell, digit, grid, candidates));
    }
    if (branches.some((b) => b === null)) continue;
    const validBranches = branches as { grid: Grid; candidates: Candidates }[];

    for (let c = 0; c < 81; c++) {
      if (grid[c] !== 0) continue;
      const allSame = validBranches.every(
        (b) => b.grid[c] !== 0 && b.grid[c] === validBranches[0].grid[c]
      );
      if (allSame && validBranches[0].grid[c] !== 0)
        return {
          technique: 'cellRegionForcingNet',
          placements: [{ cell: c, digit: validBranches[0].grid[c] }],
          eliminations: [],
          patternCells: [cell, c],
        };
      for (const digit of candidates[c]) {
        const allElim = validBranches.every((b) => !b.candidates[c].has(digit));
        if (allElim)
          return {
            technique: 'cellRegionForcingNet',
            placements: [],
            eliminations: [{ cell: c, digit }],
            patternCells: [cell, c],
          };
      }
    }
  }
  return null;
};

// Forcing chain: for each bivalue cell, try both values and see if either
// forces the same digit in the same cell — then that must be the answer.
export const findForcingChain = (
  grid: Grid,
  candidates: Candidates
): HintResult | null => {
  for (let cell = 0; cell < 81; cell++) {
    if (candidates[cell].size !== 2) continue;
    const [d1, d2] = [...candidates[cell]];
    const r1 = propagateDeep(cell, d1, grid, candidates);
    const r2 = propagateDeep(cell, d2, grid, candidates);
    if (!r1 || !r2) continue;
    // Find cells where both branches agree
    for (let c = 0; c < 81; c++) {
      if (grid[c] !== 0) continue;
      if (r1.grid[c] !== 0 && r1.grid[c] === r2.grid[c]) {
        return {
          technique: 'forcingChain',
          placements: [{ cell: c, digit: r1.grid[c] }],
          eliminations: [],
          patternCells: [cell, c],
        };
      }
      // Eliminations: digit eliminated in both branches
      for (const digit of candidates[c]) {
        if (!r1.candidates[c].has(digit) && !r2.candidates[c].has(digit)) {
          return {
            technique: 'forcingChain',
            placements: [],
            eliminations: [{ cell: c, digit }],
            patternCells: [cell, c],
          };
        }
      }
    }
  }
  return null;
};

// ============================================================
// ALS (ALMOST LOCKED SET) TECHNIQUES
// ============================================================

interface AlmostLockedSet {
  cells: Set<number>;
  digits: Set<number>;
  sector: number;
}

// Builds all Almost Locked Sets (ALS) across all 27 sectors.
// An ALS is N cells in a single sector containing exactly N+1 candidates.
// Ref: alsbuilder.pas — alsfinder procedure.
const findAlmostLockedSets = (candidates: Candidates): AlmostLockedSet[] => {
  const als: AlmostLockedSet[] = [];

  for (let sector = 0; sector < 27; sector++) {
    const house =
      sector < 9
        ? ROW_HOUSES[sector]
        : sector < 18
          ? COL_HOUSES[sector - 9]
          : BOX_HOUSES[sector - 18];

    const emptyCells = house.filter((c) => candidates[c].size > 0);
    if (emptyCells.length === 0) continue;

    for (let size = 1; size <= Math.min(8, emptyCells.length); size++) {
      for (const cellCombo of combinations(emptyCells, size)) {
        const allDigits = new Set<number>();
        for (const cell of cellCombo) {
          for (const d of candidates[cell]) allDigits.add(d);
        }

        if (allDigits.size === size + 1) {
          als.push({
            cells: new Set(cellCombo),
            digits: allDigits,
            sector,
          });
        }
      }
    }
  }

  return als;
};

const cellSectors = (cell: number): Set<number> => {
  const row = cellRow(cell);
  const col = cellCol(cell);
  const box = cellBox(cell);
  return new Set([row, col + 9, box + 18]);
};

// Returns the set of Restricted Common (RC) digits between two ALSs.
// A digit is an RC if: it appears in both ALSs, not in any overlap cell,
// and all its instances across both ALSs share 1 or 2 common sectors
// (i.e. they "see" each other — a RC should only exist in common intersections).
// Ref: ALSxz.pas — "restricted common check" block.
const getRestrictedCommon = (
  als1: AlmostLockedSet,
  als2: AlmostLockedSet,
  candidates: Candidates
): Set<number> => {
  const rc = new Set<number>();

  for (const digit of als1.digits) {
    if (!als2.digits.has(digit)) continue;

    const als1Cells = Array.from(als1.cells).filter((c) =>
      candidates[c].has(digit)
    );
    const als2Cells = Array.from(als2.cells).filter((c) =>
      candidates[c].has(digit)
    );

    // restricted commons cannot be found in an overlap cell
    if (als1Cells.some((c) => als2.cells.has(c))) continue;
    if (als1Cells.length === 0 || als2Cells.length === 0) continue;

    // combine cells from both ALSs for this digit, find common sectors
    const allCells = [...als1Cells, ...als2Cells];
    let commonSectors: Set<number> = new Set(
      Array.from({ length: 27 }, (_, i) => i)
    );
    for (const c of allCells) {
      const cs = cellSectors(c);
      commonSectors = new Set([...commonSectors].filter((s) => cs.has(s)));
    }

    // cells must exist in only 1 or 2 sectors to be restricted
    if (commonSectors.size > 0 && commonSectors.size < 3) {
      rc.add(digit);
    }
  }

  return rc;
};

// ALS-XZ: two ALSs (A and B) sharing exactly one Restricted Common (RC) digit Z.
// Any digit X common to both ALSs (but not the RC) can be eliminated from cells
// that see all instances of X in both A and B.
// Logic: if Z is placed in A, then B becomes a locked set (and vice versa),
// so X must be in whichever set doesn't contain Z — any peer seeing both is empty.
// Ref: ALSxz.pas — single restricted common elimination block.
const findALSXZ = (candidates: Candidates): HintResult | null => {
  const alsList = findAlmostLockedSets(candidates);

  for (let i = 0; i < alsList.length; i++) {
    for (let j = i + 1; j < alsList.length; j++) {
      const als1 = alsList[i];
      const als2 = alsList[j];

      // sectors can overlap, however cells cannot overlap in full
      const overlap = Array.from(als1.cells).filter((c) => als2.cells.has(c));
      if (overlap.length > 0) continue;

      // sets A & B must share at least 2 digits (1 RC + 1 X digit to eliminate)
      const commonDigits = Array.from(als1.digits).filter((d) =>
        als2.digits.has(d)
      );
      if (commonDigits.length < 2) continue;

      const rc = getRestrictedCommon(als1, als2, candidates);
      if (rc.size !== 1) continue;

      const restrictedDigit = Array.from(rc)[0];
      const xDigits = commonDigits.filter((d) => d !== restrictedDigit);

      for (const xDigit of xDigits) {
        const eliminations: Elimination[] = [];
        const als1XCells = Array.from(als1.cells).filter((c) =>
          candidates[c].has(xDigit)
        );
        const als2XCells = Array.from(als2.cells).filter((c) =>
          candidates[c].has(xDigit)
        );

        for (let cell = 0; cell < 81; cell++) {
          if (als1.cells.has(cell) || als2.cells.has(cell)) continue;
          if (!candidates[cell].has(xDigit)) continue;

          // eliminate X from any cell whose peer sees all X instances in both ALSs
          const seesAll1 = als1XCells.every((c) => PEERS[cell].has(c));
          const seesAll2 = als2XCells.every((c) => PEERS[cell].has(c));

          if (seesAll1 && seesAll2) {
            eliminations.push({ cell, digit: xDigit });
          }
        }

        if (eliminations.length > 0) {
          return {
            technique: 'alsXZ',
            placements: [],
            eliminations,
            patternCells: [...als1.cells, ...als2.cells],
            als1Cells: Array.from(als1.cells),
            als2Cells: Array.from(als2.cells),
          };
        }
      }
    }
  }

  return null;
};

// Sue de Coq (two-sector disjoint subsets): a stem of 2-3 cells at a box/line
// intersection, paired with ALSs in the line remainder and box remainder.
// The combined pattern must be a locked set (N cells, N digits, each digit
// locked to exactly one house). Any digit in the pattern can be eliminated
// from outside cells that see all pattern cells containing that digit.
// Ref: Suedecoq.pas; http://forum.enjoysudoku.com/two-sector-disjoint-subsets-t2033.html
const findSueDeCoq = (candidates: Candidates): HintResult | null => {
  const alsList = findAlmostLockedSets(candidates);

  for (let box = 0; box < 9; box++) {
    const boxCells = BOX_HOUSES[box];
    for (let lineType = 0; lineType < 2; lineType++) {
      const lineHouses = lineType === 0 ? ROW_HOUSES : COL_HOUSES;
      for (let lineIdx = 0; lineIdx < 9; lineIdx++) {
        const lineCells = lineHouses[lineIdx];
        const intersection = boxCells.filter(
          (c) => lineCells.includes(c) && candidates[c].size > 0
        );
        if (intersection.length < 2 || intersection.length > 3) continue;

        for (const stemCells of intersection.length === 2
          ? [intersection]
          : [...combinations(intersection, 2), intersection]) {
          const stemDigits = new Set<number>();
          for (const c of stemCells)
            for (const d of candidates[c]) stemDigits.add(d);

          if (stemDigits.size <= stemCells.length) continue;

          const lineRest = lineCells.filter(
            (c) => !boxCells.includes(c) && candidates[c].size > 0
          );
          const boxRest = boxCells.filter(
            (c) => !lineCells.includes(c) && candidates[c].size > 0
          );

          const lineALSCandidates = alsList.filter((als) => {
            if (!Array.from(als.cells).every((c) => lineRest.includes(c)))
              return false;
            const shared = Array.from(als.digits).filter((d) =>
              stemDigits.has(d)
            );
            return shared.length >= 1;
          });

          const boxALSCandidates = alsList.filter((als) => {
            if (!Array.from(als.cells).every((c) => boxRest.includes(c)))
              return false;
            const shared = Array.from(als.digits).filter((d) =>
              stemDigits.has(d)
            );
            return shared.length >= 1;
          });

          for (const lineALS of lineALSCandidates) {
            for (const boxALS of boxALSCandidates) {
              const allCells = new Set([
                ...stemCells,
                ...lineALS.cells,
                ...boxALS.cells,
              ]);
              const allDigits = new Set<number>();
              for (const c of allCells)
                for (const d of candidates[c]) allDigits.add(d);

              // type 1: N cells with N digits where each digit is locked to
              // exactly 1 sector (row, col, or box)
              if (allCells.size !== allDigits.size) continue;

              const lockedOk = Array.from(allDigits).every((digit) => {
                const cellsWithDigit = Array.from(allCells).filter((c) =>
                  candidates[c].has(digit)
                );
                return HOUSES.some((house) =>
                  cellsWithDigit.every((c) => house.includes(c))
                );
              });
              if (!lockedOk) continue;

              // eliminations for all digits: since each digit is locked to 1 sector,
              // outside cells seeing all instances of that digit can be eliminated
              const eliminations: Elimination[] = [];
              for (const digit of allDigits) {
                const cellsWithDigit = Array.from(allCells).filter((c) =>
                  candidates[c].has(digit)
                );
                for (let cell = 0; cell < 81; cell++) {
                  if (allCells.has(cell)) continue;
                  if (!candidates[cell].has(digit)) continue;
                  if (cellsWithDigit.every((c) => PEERS[cell].has(c))) {
                    eliminations.push({ cell, digit });
                  }
                }
              }

              if (eliminations.length > 0) {
                return {
                  technique: 'sueDeCoq',
                  placements: [],
                  eliminations,
                  patternCells: Array.from(allCells),
                };
              }
            }
          }
        }
      }
    }
  }

  return null;
};

// Death Blossom: a stem cell with 2-4 candidates, each covered by a "petal" ALS
// such that every digit candidate of the stem appears as an RC in exactly one petal.
// Non-stem digits appearing in the petals can be eliminated from outside cells
// that see all instances of that digit across all petals.
// Logic: the stem must place one of its digits; whichever it is, that petal becomes
// a locked set — so all non-stem digits in the petals are locked within them.
// Ref: Deathblossom.pas — "type 1: N cells with N digits where each of the N digits
// is locked to 1 sector exactly ie N sectors"; eliminations for all digits.
const findDeathBlossom = (
  candidates: Candidates,
  grid?: Grid
): HintResult | null => {
  const alsList = findAlmostLockedSets(candidates);

  for (let stemCell = 0; stemCell < 81; stemCell++) {
    const stemCands = candidates[stemCell];
    if (stemCands.size < 2 || stemCands.size > 4) continue;

    const petalMap = new Map<number, AlmostLockedSet[]>();
    for (const digit of stemCands) {
      // petal ALS must contain the stem digit, with all its instances of that
      // digit visible to the stem cell (forming the restricted common link)
      const petals = alsList.filter((als) => {
        if (als.cells.has(stemCell)) return false;
        if (!als.digits.has(digit)) return false;
        const alsCellsWithDigit = Array.from(als.cells).filter((c) =>
          candidates[c].has(digit)
        );
        return alsCellsWithDigit.every((c) => PEERS[stemCell].has(c));
      });
      if (petals.length === 0) break;
      petalMap.set(digit, petals);
    }

    if (petalMap.size !== stemCands.size) continue;

    const stemDigits = Array.from(stemCands);
    const petalArrays = stemDigits.map((d) => petalMap.get(d)!);

    const search = (
      idx: number,
      usedCells: Set<number>,
      chosen: AlmostLockedSet[]
    ): HintResult | null => {
      if (idx === stemDigits.length) {
        const allCells = new Set([stemCell, ...usedCells]);
        const nonStemDigits = new Set<number>();
        for (let pi = 0; pi < chosen.length; pi++) {
          for (const d of chosen[pi].digits) {
            if (!stemCands.has(d)) nonStemDigits.add(d);
          }
        }

        const eliminations: Elimination[] = [];

        // eliminations for all digits: since each digit is locked within the
        // combined petal sets, any outside cell seeing all instances is empty
        for (const digit of nonStemDigits) {
          const allCellsWithDigit: number[] = [];
          for (const als of chosen) {
            if (!als.digits.has(digit)) continue;
            for (const c of als.cells) {
              if (candidates[c].has(digit)) allCellsWithDigit.push(c);
            }
          }
          if (allCellsWithDigit.length === 0) continue;

          for (let cell = 0; cell < 81; cell++) {
            if (allCells.has(cell)) continue;
            if (!candidates[cell].has(digit)) continue;
            if (allCellsWithDigit.every((c) => PEERS[cell].has(c))) {
              eliminations.push({ cell, digit });
            }
          }
        }

        const validated =
          grid === undefined
            ? eliminations
            : eliminations.filter(
                ({ cell, digit }) =>
                  propagateDeep(cell, digit, grid, candidates) === null
              );

        if (validated.length > 0) {
          return {
            technique: 'deathBlossom',
            placements: [],
            eliminations: validated,
            patternCells: Array.from(allCells),
            stemCell,
            petalCells: chosen.map((als) => Array.from(als.cells)),
          };
        }
        return null;
      }

      for (const als of petalArrays[idx]) {
        if (Array.from(als.cells).some((c) => usedCells.has(c))) continue;
        const nextUsed = new Set([...usedCells, ...als.cells]);
        const result = search(idx + 1, nextUsed, [...chosen, als]);
        if (result) return result;
      }
      return null;
    };

    const result = search(0, new Set(), []);
    if (result) return result;
  }

  return null;
};

// ============================================================
// APPLY / FIND / SOLVE
// ============================================================

export const applyHint = (
  grid: Grid,
  candidates: Candidates,
  hint: Pick<HintResult, 'placements' | 'eliminations'>
): { grid: Grid; candidates: Candidates } => {
  const newGrid = [...grid];
  const newCandidates = candidates.map((s) => new Set(s));
  for (const { cell, digit } of hint.placements) {
    newGrid[cell] = digit;
    newCandidates[cell] = new Set();
    for (const peer of PEERS[cell]) newCandidates[peer].delete(digit);
  }
  for (const { cell, digit } of hint.eliminations)
    newCandidates[cell].delete(digit);
  return { grid: newGrid, candidates: newCandidates };
};

export const findHint = (
  grid: Grid,
  candidates: Candidates
): HintResult | null =>
  withNotation(
    findNakedSingle(candidates) ??
      findHiddenSingle(candidates, BOX_HOUSES, 'hiddenSingleBox') ??
      findHiddenSingle(candidates, ROW_HOUSES, 'hiddenSingleRow') ??
      findHiddenSingle(candidates, COL_HOUSES, 'hiddenSingleCol') ??
      findHiddenGroup(candidates, 2) ??
      findLockedCandidates(candidates) ??
      findHiddenGroup(candidates, 3) ??
      findHiddenGroup(candidates, 4) ??
      findNakedGroup(candidates, 2) ??
      findNakedGroup(candidates, 3) ??
      findNakedGroup(candidates, 4) ??
      findFish(candidates, 2) ??
      findFish(candidates, 3) ??
      findSkyscraper(candidates) ??
      findTwoStringKite(candidates) ??
      findYWing(candidates) ??
      findXYZWing(candidates) ??
      findFinnedFish(candidates, 2) ??
      findWWing(candidates) ??
      findEmptyRectangle(candidates) ??
      findUniqueRectangle(grid, candidates) ??
      findFinnedFish(candidates, 3) ??
      findFish(candidates, 4) ??
      findBUG(candidates) ??
      findFinnedFish(candidates, 4) ??
      findXYChain(candidates) ??
      findAIC(candidates, grid) ??
      findGroupedAIC(candidates, grid) ??
      findALSXZ(candidates) ??
      findSueDeCoq(candidates) ??
      findDeathBlossom(candidates, grid) ??
      findNishio(grid, candidates) ??
      findNishioNet(grid, candidates) ??
      findCellRegionForcingChain(grid, candidates) ??
      findCellRegionForcingNet(grid, candidates) ??
      findForcingChain(grid, candidates)
  );

export const humanSolve = (
  initialGrid: Grid
): { grid: Grid; candidates: Candidates; steps: HintResult[] } => {
  let grid = [...initialGrid];
  let candidates = buildCandidates(grid);
  const steps: HintResult[] = [];
  while (true) {
    const hint = findHint(grid, candidates);
    if (!hint) break;
    const next = applyHint(grid, candidates, hint);
    grid = next.grid;
    candidates = next.candidates;
    steps.push(hint);
  }
  return { grid, candidates, steps };
};
