import type { HintResult } from './types/HintResult';
import type { Technique } from './types/Technique';
import type { ChainNode } from './types/ChainNode';

// ---- Coordinate helpers ----

const cellRow = (cell: number) => Math.floor(cell / 9);
const cellCol = (cell: number) => cell % 9;
const cellBox = (cell: number) =>
  Math.floor(cellRow(cell) / 3) * 3 + Math.floor(cellCol(cell) / 3);

export const eurekaCell = (cell: number): string =>
  `r${cellRow(cell) + 1}c${cellCol(cell) + 1}`;

// ---- Eureka notation builder ----

const conclusionStr = (hint: HintResult): string => {
  const parts: string[] = [];
  for (const { cell, digit } of hint.placements) {
    parts.push(`${eurekaCell(cell)}=${digit}`);
  }
  for (const { cell, digit } of hint.eliminations) {
    parts.push(`${eurekaCell(cell)}<>${digit}`);
  }
  return parts.join(', ');
};

// Render chain path using chainPath field
const renderChainPath = (path: ChainNode[]): string => {
  if (path.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const next = path[i + 1];
    const cells = node.cells ?? [node.cell];

    let nodeStr: string;
    if (cells.length === 1) {
      nodeStr = `(${node.digit})${eurekaCell(cells[0])}`;
    } else {
      // Group node: same row or same col?
      const rows = [...new Set(cells.map(cellRow))];
      const cols = [...new Set(cells.map(cellCol))];
      if (rows.length === 1) {
        // Same row: (d)rRc[C1C2...]
        const colStr = cols.map((c) => c + 1).join('');
        nodeStr = `(${node.digit})r${rows[0] + 1}c[${colStr}]`;
      } else if (cols.length === 1) {
        // Same col: (d)r[R1R2...]cC
        const rowStr = rows.map((r) => r + 1).join('');
        nodeStr = `(${node.digit})r[${rowStr}]c${cols[0] + 1}`;
      } else {
        // Fallback: list each cell
        nodeStr = `(${node.digit})${cells.map(eurekaCell).join('|')}`;
      }
    }

    parts.push(nodeStr);

    if (next !== undefined) {
      const link = node.linkToNext ?? (node.isOn ? 'weak' : 'strong');
      parts.push(link === 'strong' ? '=' : '-');
    }
  }
  return parts.join('');
};

export const buildEureka = (hint: HintResult): string => {
  const conc = conclusionStr(hint);

  // Placeholder/unimplemented techniques return empty string
  const placeholders: Technique[] = [
    'uniqueRectangleType5',
    'nishio',
    'nishioNet',
    'cellRegionForcingChain',
    'cellRegionForcingNet',
    'forcingChain',
  ];
  if (placeholders.includes(hint.technique)) return '';

  switch (hint.technique) {
    case 'nakedSingle': {
      const { cell, digit } = hint.placements[0];
      return `(${digit})${eurekaCell(cell)} => ${eurekaCell(cell)}=${digit}`;
    }

    case 'hiddenSingleBox':
    case 'hiddenSingleRow':
    case 'hiddenSingleCol': {
      const { cell, digit } = hint.placements[0];
      return `(${digit})${eurekaCell(cell)} => ${eurekaCell(cell)}=${digit}`;
    }

    case 'lockedCandidatePointing': {
      // patternCells are box cells; digit from eliminations
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cells = hint.patternCells;
      const box = cellBox(cells[0]);
      const boxStr = `box${box + 1}`;
      return `(${digit})${boxStr} => ${conc}`;
    }

    case 'lockedCandidateClaiming': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cells = hint.patternCells;
      const rows = [...new Set(cells.map(cellRow))];
      const cols = [...new Set(cells.map(cellCol))];
      let lineStr: string;
      if (rows.length === 1) {
        lineStr = `r${rows[0] + 1}`;
      } else {
        lineStr = `c${cols[0] + 1}`;
      }
      return `(${digit})${lineStr} => ${conc}`;
    }

    case 'nakedPair':
    case 'nakedTriple':
    case 'nakedQuad': {
      // Get union of digits in pattern cells from eliminations
      const digits = [...new Set(hint.eliminations.map((e) => e.digit))].sort();
      const cellsStr = hint.patternCells.map(eurekaCell).join(',');
      return `(${digits.join(',')})${cellsStr} => ${conc}`;
    }

    case 'hiddenPair':
    case 'hiddenTriple':
    case 'hiddenQuad': {
      const digits = hint.hiddenDigits ?? [];
      const cellsStr = hint.patternCells.map(eurekaCell).join(',');
      return `(${digits.join(',')})${cellsStr} => ${conc}`;
    }

    case 'xWing':
    case 'swordfish':
    case 'jellyfish': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cells = hint.patternCells;
      const rows = [...new Set(cells.map(cellRow))].sort((a, b) => a - b);
      const cols = [...new Set(cells.map(cellCol))].sort((a, b) => a - b);
      // rows-based fish: (d)r[R1R2]cC1-(d)r[R1R2]cC2 => ...
      if (rows.length <= cols.length) {
        const rowStr = rows.map((r) => r + 1).join('');
        const colParts = cols
          .map((c) => `(${digit})r[${rowStr}]c${c + 1}`)
          .join('-');
        return `${colParts} => ${conc}`;
      } else {
        const colStr = cols.map((c) => c + 1).join('');
        const rowParts = rows
          .map((r) => `(${digit})r${r + 1}c[${colStr}]`)
          .join('-');
        return `${rowParts} => ${conc}`;
      }
    }

    case 'finnedXWing':
    case 'finnedSwordfish':
    case 'finnedJellyfish': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cells = hint.patternCells;
      const cellsStr = cells.map((c) => `(${digit})${eurekaCell(c)}`).join('|');
      return `${cellsStr} => ${conc}`;
    }

    case 'skyscraper': {
      // patternCells: [aCell0, aCell1, bCell0, bCell1]
      const digit = hint.eliminations[0]?.digit ?? 0;
      const [c0, c1, c2, c3] = hint.patternCells;
      const link = `(${digit})${eurekaCell(c0)}=(${digit})${eurekaCell(c1)}-(${digit})${eurekaCell(c2)}=(${digit})${eurekaCell(c3)}`;
      return `${link} => ${conc}`;
    }

    case 'twoStringKite': {
      // patternCells: [colCell, rowCell, colRoof, rowRoof]
      const digit = hint.eliminations[0]?.digit ?? 0;
      const [colCell, rowCell, colRoof, rowRoof] = hint.patternCells;
      const link = `(${digit})${eurekaCell(colCell)}=(${digit})${eurekaCell(rowCell)}-(${digit})${eurekaCell(colRoof)}=(${digit})${eurekaCell(rowRoof)}`;
      return `${link} => ${conc}`;
    }

    case 'emptyRectangle': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      // patternCells: [...boxCells, pivot, strongEnd]
      const pivot = hint.patternCells[hint.patternCells.length - 2];
      const strongEnd = hint.patternCells[hint.patternCells.length - 1];
      const boxCells = hint.patternCells.slice(0, hint.patternCells.length - 2);
      const box = cellBox(boxCells[0]);
      return `(${digit})box${box + 1}-(${digit})${eurekaCell(pivot)}=(${digit})${eurekaCell(strongEnd)} => ${conc}`;
    }

    case 'wWing': {
      // patternCells: [c1, c2, lc1, lc2]
      // patternDigits: [linkDigit] (the strong-link digit between lc1 and lc2)
      const [c1, c2, lc1, lc2] = hint.patternCells;
      const elimDigit = hint.eliminations[0]?.digit ?? 0;
      const linkDigit = hint.patternDigits?.[0] ?? elimDigit;
      const link = `(${elimDigit})${eurekaCell(c1)}-(${linkDigit})${eurekaCell(lc1)}=(${linkDigit})${eurekaCell(lc2)}-(${elimDigit})${eurekaCell(c2)}`;
      return `${link} => ${conc}`;
    }

    case 'yWing': {
      // patternCells: [pivot, p1, p2]
      const [pivot, p1, p2] = hint.patternCells;
      const elimDigit = hint.eliminations[0]?.digit ?? 0;
      // Use chainPath if available for exact digits
      if (hint.chainPath && hint.chainPath.length >= 3) {
        return `${renderChainPath(hint.chainPath)} => ${conc}`;
      }
      // Fallback: simple cell notation
      return `(?)${eurekaCell(pivot)}-(?)${eurekaCell(p1)}-(?)${eurekaCell(p2)} => ${eurekaCell(hint.eliminations[0]?.cell ?? 0)}<>${elimDigit}`;
    }

    case 'xyzWing': {
      // patternCells: [pivot, p1, p2]
      const [pivot, p1, p2] = hint.patternCells;
      const elimDigit = hint.eliminations[0]?.digit ?? 0;
      if (hint.chainPath && hint.chainPath.length >= 3) {
        return `${renderChainPath(hint.chainPath)} => ${conc}`;
      }
      return `(?)${eurekaCell(pivot)}-(?)${eurekaCell(p1)}-(?)${eurekaCell(p2)} => ${eurekaCell(hint.eliminations[0]?.cell ?? 0)}<>${elimDigit}`;
    }

    case 'xyChain': {
      if (hint.chainPath && hint.chainPath.length >= 2) {
        return `${renderChainPath(hint.chainPath)} => ${conc}`;
      }
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cellsStr = hint.patternCells
        .map((c) => `(?)${eurekaCell(c)}`)
        .join('-');
      return `${cellsStr} => ${eurekaCell(hint.eliminations[0]?.cell ?? 0)}<>${digit}`;
    }

    case 'aic':
    case 'aicRing':
    case 'groupedAIC': {
      if (hint.chainPath && hint.chainPath.length >= 2) {
        const chainStr = renderChainPath(hint.chainPath);
        if (hint.technique === 'aicRing') {
          // Close the ring by appending the start node
          const firstNode = hint.chainPath[0];
          const lastNode = hint.chainPath[hint.chainPath.length - 1];
          const lastLink =
            lastNode.linkToNext === 'strong'
              ? '='
              : lastNode.linkToNext === 'weak'
                ? '-'
                : lastNode.isOn
                  ? '-'
                  : '=';
          const firstCells = firstNode.cells ?? [firstNode.cell];
          let firstNodeStr: string;
          if (firstCells.length === 1) {
            firstNodeStr = `(${firstNode.digit})${eurekaCell(firstCells[0])}`;
          } else {
            firstNodeStr = `(${firstNode.digit})${firstCells.map(eurekaCell).join('|')}`;
          }
          return `${chainStr}${lastLink}${firstNodeStr} => ${conc}`;
        }
        return `${chainStr} => ${conc}`;
      }
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cellsStr = hint.patternCells
        .map((c) => `(${digit})${eurekaCell(c)}`)
        .join('-');
      return `${cellsStr} => ${conc}`;
    }

    case 'uniqueRectangleType1':
    case 'uniqueRectangleType2':
    case 'uniqueRectangleType3':
    case 'uniqueRectangleType4': {
      const rows = [...new Set(hint.patternCells.map(cellRow))]
        .sort()
        .map((r) => r + 1)
        .join('');
      const cols = [...new Set(hint.patternCells.map(cellCol))]
        .sort()
        .map((c) => c + 1)
        .join('');
      const digits = (hint.patternDigits ?? []).join(',');
      return `UR(${digits})r${rows}c${cols} => ${conc}`;
    }

    case 'bug': {
      const { cell, digit } = hint.placements[0];
      return `BUG+1 => ${eurekaCell(cell)}=${digit}`;
    }

    case 'alsXZ': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const elimCells = hint.eliminations
        .map((e) => eurekaCell(e.cell))
        .join(',');
      const aStr = hint.als1Cells
        ? hint.als1Cells.map(eurekaCell).join(',')
        : '';
      const bStr = hint.als2Cells
        ? hint.als2Cells.map(eurekaCell).join(',')
        : '';
      return `A(${aStr}) - B(${bStr}) => ${elimCells}<>${digit}`;
    }

    case 'sueDeCoq': {
      const cellsStr = hint.patternCells.map(eurekaCell).join(',');
      return `SDC(${cellsStr}) => ${conc}`;
    }

    case 'deathBlossom': {
      const stemStr =
        hint.stemCell !== undefined ? eurekaCell(hint.stemCell) : '';
      const petalsStr = hint.petalCells
        ? hint.petalCells
            .map(
              (cells, i) =>
                `Petal${String.fromCharCode(65 + i)}(${cells.map(eurekaCell).join(',')})`
            )
            .join(' | ')
        : '';
      return `DB: stem=${stemStr} | ${petalsStr} => ${conc}`;
    }

    default:
      return '';
  }
};

// ---- Human-readable explanation builder ----

export const buildExplanation = (hint: HintResult): string => {
  switch (hint.technique) {
    case 'nakedSingle': {
      const { cell, digit } = hint.placements[0];
      return `${digit} is the only remaining candidate in the cell ${eurekaCell(cell)}. This is a Naked Single.`;
    }

    case 'hiddenSingleBox': {
      const { cell, digit } = hint.placements[0];
      const box = cellBox(cell);
      return `${digit} can only go in ${eurekaCell(cell)} within box ${box + 1}. This is a Hidden Single.`;
    }

    case 'hiddenSingleRow': {
      const { cell, digit } = hint.placements[0];
      const row = cellRow(cell);
      return `${digit} can only go in ${eurekaCell(cell)} within row ${row + 1}. This is a Hidden Single.`;
    }

    case 'hiddenSingleCol': {
      const { cell, digit } = hint.placements[0];
      const col = cellCol(cell);
      return `${digit} can only go in ${eurekaCell(cell)} within column ${col + 1}. This is a Hidden Single.`;
    }

    case 'lockedCandidatePointing': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cells = hint.patternCells;
      const box = cellBox(cells[0]);
      const rows = [...new Set(cells.map(cellRow))];
      const cols = [...new Set(cells.map(cellCol))];
      const line =
        rows.length === 1 ? `row ${rows[0] + 1}` : `column ${cols[0] + 1}`;
      const elimCells = hint.eliminations
        .map((e) => eurekaCell(e.cell))
        .join(', ');
      return `${digit} in box ${box + 1} is confined to ${line}, eliminating ${digit} from ${elimCells}. This is the Locked Candidates Pointing technique.`;
    }

    case 'lockedCandidateClaiming': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cells = hint.patternCells;
      const rows = [...new Set(cells.map(cellRow))];
      const cols = [...new Set(cells.map(cellCol))];
      const line =
        rows.length === 1 ? `row ${rows[0] + 1}` : `column ${cols[0] + 1}`;
      const box = cellBox(hint.eliminations[0]?.cell ?? 0);
      const elimCells = hint.eliminations
        .map((e) => eurekaCell(e.cell))
        .join(', ');
      return `${digit} in ${line} is confined to box ${box + 1}, eliminating ${digit} from ${elimCells}. This is the Locked Candidates Claiming technique.`;
    }

    case 'nakedPair': {
      const digits = [...new Set(hint.eliminations.map((e) => e.digit))].sort();
      const cellsStr = hint.patternCells.map(eurekaCell).join(' and ');
      return `${cellsStr} share candidates {${digits.join(',')}}, eliminating those from the rest of their shared house. This is a Naked Pair.`;
    }

    case 'nakedTriple': {
      const digits = [...new Set(hint.eliminations.map((e) => e.digit))].sort();
      const cellsStr = hint.patternCells.map(eurekaCell).join(', ');
      return `${cellsStr} share candidates {${digits.join(',')}}, eliminating those from the rest of their shared house. This is a Naked Triple.`;
    }

    case 'nakedQuad': {
      const digits = [...new Set(hint.eliminations.map((e) => e.digit))].sort();
      const cellsStr = hint.patternCells.map(eurekaCell).join(', ');
      return `${cellsStr} share candidates {${digits.join(',')}}, eliminating those from the rest of their shared house. This is a Naked Quad.`;
    }

    case 'hiddenPair': {
      const digits = hint.hiddenDigits ?? [];
      const cellsStr = hint.patternCells.map(eurekaCell).join(' and ');
      return `${cellsStr} are the only cells for digits {${digits.join(',')}}, so other candidates can be eliminated from those cells. This is a Hidden Pair.`;
    }

    case 'hiddenTriple': {
      const digits = hint.hiddenDigits ?? [];
      const cellsStr = hint.patternCells.map(eurekaCell).join(', ');
      return `${cellsStr} are the only cells for digits {${digits.join(',')}}, so other candidates can be eliminated from those cells. This is a Hidden Triple.`;
    }

    case 'hiddenQuad': {
      const digits = hint.hiddenDigits ?? [];
      const cellsStr = hint.patternCells.map(eurekaCell).join(', ');
      return `${cellsStr} are the only cells for digits {${digits.join(',')}}, so other candidates can be eliminated from those cells. This is a Hidden Quad.`;
    }

    case 'xWing': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cells = hint.patternCells;
      const rows = [...new Set(cells.map(cellRow))].sort((a, b) => a - b);
      const cols = [...new Set(cells.map(cellCol))].sort((a, b) => a - b);
      if (rows.length === 2 && cols.length === 2) {
        return `${digit} forms an X-Wing pattern, in rows ${rows.map((r) => r + 1).join(' and ')} is confined to columns ${cols.map((c) => c + 1).join(' and ')}, eliminating ${digit} from the rest of those columns.`;
      }
      return `${digit} forms an X-Wing pattern, eliminating ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'swordfish': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      return `${digit} forms a Swordfish pattern, eliminating ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'jellyfish': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      return `${digit} forms a Jellyfish pattern, eliminating ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'finnedXWing': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      return `${digit} forms a Finned X-Wing pattern. Eliminates ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'finnedSwordfish': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      return `${digit} forms a Finned Swordfish pattern. Eliminates ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'finnedJellyfish': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      return `${digit} forms a Finned Jellyfish pattern. Eliminates ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'skyscraper': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const cells = hint.patternCells;
      const rows = [...new Set(cells.map(cellRow))].sort((a, b) => a - b);
      const cols = [...new Set(cells.map(cellCol))].sort((a, b) => a - b);
      if (rows.length === 2) {
        return `${digit} forms a skyscraper in rows ${rows.map((r) => r + 1).join(' and ')} with a shared column. Eliminates ${digit} from cells seeing both roof cells.`;
      }
      return `${digit} forms a skyscraper in columns ${cols.map((c) => c + 1).join(' and ')} with a shared row. Eliminates ${digit} from cells seeing both roof cells.`;
    }

    case 'twoStringKite': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      return `${digit} forms a kite with a conjugate row and column sharing a box. Eliminates ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'emptyRectangle': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      const boxCells = hint.patternCells.slice(0, hint.patternCells.length - 2);
      const box = cellBox(boxCells[0]);
      return `${digit} in box ${box + 1} forms an empty rectangle. Eliminates ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'wWing': {
      const [c1, c2] = hint.patternCells;
      const elimDigit = hint.eliminations[0]?.digit ?? 0;
      return `W-Wing cells ${eurekaCell(c1)} and ${eurekaCell(c2)} share candidates connected via a strong link. Eliminates ${elimDigit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'yWing': {
      const [pivot, p1, p2] = hint.patternCells;
      const elimDigit = hint.eliminations[0]?.digit ?? 0;
      return `Y-Wing pivot ${eurekaCell(pivot)} links pincers ${eurekaCell(p1)} and ${eurekaCell(p2)}. Eliminates ${elimDigit} from cells seeing both pincers.`;
    }

    case 'xyzWing': {
      const [pivot, p1, p2] = hint.patternCells;
      const elimDigit = hint.eliminations[0]?.digit ?? 0;
      return `XYZ-Wing pivot ${eurekaCell(pivot)} with wings ${eurekaCell(p1)} and ${eurekaCell(p2)}. Eliminates ${elimDigit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'uniqueRectangleType1': {
      const rows = [...new Set(hint.patternCells.map(cellRow))]
        .sort()
        .map((r) => r + 1);
      const cols = [...new Set(hint.patternCells.map(cellCol))]
        .sort()
        .map((c) => c + 1);
      const floorDigits = (hint.patternDigits ?? []).join(',');
      return `The UR(${floorDigits}) pattern in rows ${rows.join(',')} cols ${cols.join(',')} has floor digits that cannot all be the solution. Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;
    }

    case 'uniqueRectangleType2': {
      const floorDigits = (hint.patternDigits ?? []).join(',');
      return `The UR(${floorDigits}) Type 2 pattern forces an extra digit. Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;
    }

    case 'uniqueRectangleType3': {
      const floorDigits = (hint.patternDigits ?? []).join(',');
      return `The UR(${floorDigits}) Type 3 pattern forms a naked group. Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;
    }

    case 'uniqueRectangleType4': {
      const floorDigits = (hint.patternDigits ?? []).join(',');
      return `A floor digit is locked within the UR(${floorDigits}) Type 4, eliminating the other floor digit from extra cells. Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;
    }

    case 'uniqueRectangleType5':
      return `Unique Rectangle Type 5: Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;

    case 'bug': {
      const { cell, digit } = hint.placements[0];
      return `BUG+1: All unsolved cells are bivalue except ${eurekaCell(cell)}. Placing ${digit} in ${eurekaCell(cell)} resolves the BUG.`;
    }

    case 'xyChain': {
      const elimStr = hint.eliminations
        .map((e) => `${e.digit} from ${eurekaCell(e.cell)}`)
        .join(', ');
      return `XY-Chain: The alternating bivalue chain eliminates ${elimStr}.`;
    }

    case 'aic': {
      const elimStr = hint.eliminations
        .map((e) => `${e.digit} from ${eurekaCell(e.cell)}`)
        .join(', ');
      return `AIC: The alternating inference chain eliminates ${elimStr}.`;
    }

    case 'aicRing': {
      return `AIC Ring: The chain forms a closed loop. Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;
    }

    case 'groupedAIC': {
      const elimStr = hint.eliminations
        .map((e) => `${e.digit} from ${eurekaCell(e.cell)}`)
        .join(', ');
      return `Grouped AIC: The grouped alternating inference chain eliminates ${elimStr}.`;
    }

    case 'alsXZ': {
      const digit = hint.eliminations[0]?.digit ?? 0;
      return `ALS-XZ: Two Almost Locked Sets share a restricted common, eliminating ${digit} from ${hint.eliminations.map((e) => eurekaCell(e.cell)).join(', ')}.`;
    }

    case 'sueDeCoq':
      return `Sue de Coq: The two-sector disjoint subset pattern eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;

    case 'deathBlossom':
      return `Death Blossom: The stem cell's ALS petals lock digits, eliminating ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;

    case 'nishio':
      return `Nishio: Assuming ${hint.eliminations[0]?.digit} in ${eurekaCell(hint.eliminations[0]?.cell ?? 0)} leads to a contradiction.`;

    case 'nishioNet':
      return `Nishio Net: Assuming ${hint.eliminations[0]?.digit} in ${eurekaCell(hint.eliminations[0]?.cell ?? 0)} leads to a contradiction via full propagation.`;

    case 'cellRegionForcingChain': {
      if (hint.placements.length > 0) {
        const { cell, digit } = hint.placements[0];
        return `Cell/Region Forcing Chain: All branches force ${digit} into ${eurekaCell(cell)}.`;
      }
      return `Cell/Region Forcing Chain: Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;
    }

    case 'cellRegionForcingNet': {
      if (hint.placements.length > 0) {
        const { cell, digit } = hint.placements[0];
        return `Cell/Region Forcing Net: All branches force ${digit} into ${eurekaCell(cell)}.`;
      }
      return `Cell/Region Forcing Net: Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;
    }

    case 'forcingChain': {
      if (hint.placements.length > 0) {
        const { cell, digit } = hint.placements[0];
        return `Forcing Chain: Both branches from the bivalue cell force ${digit} into ${eurekaCell(cell)}.`;
      }
      return `Forcing Chain: Eliminates ${hint.eliminations.map((e) => `${e.digit} from ${eurekaCell(e.cell)}`).join(', ')}.`;
    }

    default:
      return '';
  }
};
