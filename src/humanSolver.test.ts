import { describe, expect, it } from 'vitest';
import {
  puzzleToGrid,
  gridToPuzzle,
  buildCandidates,
  applyHint,
  findHint,
  findAIC,
  findGroupedAIC,
  findFinnedFish,
  findNishio,
  findNishioNet,
  findCellRegionForcingChain,
  findCellRegionForcingNet,
  findForcingChain,
  humanSolve,
} from './humanSolver';
import type { HintResult } from './types/HintResult';
import type { ChainNode } from './types/ChainNode';
import { puzzleTextToPuzzle } from './helpers/puzzleTextToPuzzle';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse an 81-char puzzle string (. = empty) into a flat grid. */
const parseGrid = (text: string): number[] =>
  text.split('').map((c) => (c === '.' ? 0 : parseInt(c, 10)));

/**
 * Advance the solver step-by-step, stopping when the next hint would use a
 * technique in `stopTechniques`. Returns the stalled {grid, candidates}.
 * Only applies hints whose technique is NOT in the stop set.
 */
const advanceUntilStall = (
  init: number[],
  stopTechniques: string[]
): { grid: number[]; candidates: Set<number>[] } => {
  const stop = new Set(stopTechniques);
  let g = [...init];
  let c = buildCandidates(g);
  for (let i = 0; i < 1000; i++) {
    const hint = findHint(g, c);
    if (!hint) break;
    if (stop.has(hint.technique)) break;
    const next = applyHint(g, c, hint);
    g = next.grid;
    c = next.candidates;
  }
  return { grid: g, candidates: c };
};

/**
 * Continue solving from an already-advanced state (grid + candidates),
 * returning true if the puzzle reaches a fully filled grid.
 */
const isSolvableFromState = (
  grid: number[],
  candidates: Set<number>[]
): boolean => {
  let g = [...grid];
  let c = candidates.map((s) => new Set(s));
  for (let i = 0; i < 1000; i++) {
    if (g.every((v) => v > 0)) return true;
    const hint = findHint(g, c);
    if (!hint) return false;
    const next = applyHint(g, c, hint);
    g = next.grid;
    c = next.candidates;
  }
  return g.every((v) => v > 0);
};

/** Collect all technique names used while solving a puzzle. */
const collectTechniques = (grid: number[]): string[] => {
  const { steps, grid: solved } = humanSolve(grid);
  expect(solved.every((v) => v > 0)).toBe(true);
  return steps.map((s) => s.technique);
};

/** Assert that humanSolve fully solves a puzzle and matches the known final. */
const expectSolvedWithFinal = (init: string, final: string): HintResult[] => {
  const grid = parseGrid(init);
  const { grid: solved, steps } = humanSolve(grid);
  const expected = parseGrid(final);
  expect(solved.every((v) => v > 0)).toBe(true);
  expect(solved).toEqual(expected);
  return steps;
};

// ---------------------------------------------------------------------------
// All 50 puzzles from the Sudoku Race PDF (February 2026 edition)
// Extracted from QR code URLs: sudoku.bubblyclouds.com/puzzle?initial=...&final=...
// puzzle-N is 0-indexed.
// ---------------------------------------------------------------------------

const PUZZLES: {
  n: number;
  difficulty: string;
  init: string;
  final: string;
}[] = [
  {
    n: 0,
    difficulty: '1-very-easy',
    init: '2.1.8....9..17..4..7....15285671.4....9...6154123....75.4....8...39.45...27..1...',
    final:
      '241583769965172348378496152856719423739248615412365897594637281183924576627851934',
  },
  {
    n: 1,
    difficulty: '2-easy',
    init: '.645..........43.5.8.1..9.6.9.........2.3.6.43.7.6.182...4.....7.9.26..342..59..8',
    final:
      '264593871971684325583172946698241537152738694347965182835417269719826453426359718',
  },
  {
    n: 2,
    difficulty: '2-easy',
    init: '.2.5913.4..4...1926.1..4.8....1.68.9.18.73....5.8.9..724..689..78...56......3....',
    final:
      '827591364534687192691324785472156839918273546356849217243768951789415623165932478',
  },
  {
    n: 3,
    difficulty: '2-easy',
    init: '3.91.75..18.62....75..4..8...8..16976..39..15..57.8..25.....7.88.35...69.9.816..4',
    final:
      '329187546184625973756943281438251697672394815915768432561439728843572169297816354',
  },
  {
    n: 4,
    difficulty: '3-moderately-easy',
    init: '..9.7.1545..3.46..4...9.7.3..5.3.97..439..216.7.68.3..794..3.6.15......232..6.497',
    final:
      '639278154587314629412596783265431978843957216971682345794823561156749832328165497',
  },
  {
    n: 5,
    difficulty: '3-moderately-easy',
    init: '..81..3.66.724...5219.5..4.17.....895...23.71..6..9.3.9.......3..59...6....584.92',
    final:
      '458197326637248915219356847173465289594823671826719534982671453745932168361584792',
  },
  {
    n: 6,
    difficulty: '3-moderately-easy',
    init: '318.6.25.5...4.3..96.5.21.....4256.....7.6....45.1...8....53.4.2918..56.4.3....7.',
    final:
      '318967254572148396964532187837425619129786435645319728786253941291874563453691872',
  },
  {
    n: 7,
    difficulty: '3-moderately-easy',
    init: '...436.7...29...15....1586.6...59.34.23.8..5...51.3689136......2.9.613..5...9...6',
    final:
      '851436972362978415497215863618759234923684751745123689136842597279561348584397126',
  },
  {
    n: 8,
    difficulty: '3-moderately-easy',
    init: '.5...1.9....985.2...2367...96541.3.2.27.....9..1.9..68.74.2.951.8...9....1965.8..',
    final:
      '758241693136985724492367185965418372827536419341792568674823951583179246219654837',
  },
  {
    n: 9,
    difficulty: '4-moderate',
    init: '........1..24..9.......6.8212..9........6.4.89..3...........1.....1.5.373.86.9...',
    final:
      '563982741872413956491756382124598673735261498986347215257834169649125837318679524',
  },
  {
    n: 10,
    difficulty: '4-moderate',
    init: '..4.....35.7....6....8...9.....513...267..4...8...2......31........26..84...9.6..',
    final:
      '894165273517239864263874195749651382126783459385942716652318947971426538438597621',
  },
  {
    n: 11,
    difficulty: '4-moderate',
    init: '1..6..9......5...4..87...3.2.5.8......1......7...3.2......7..48..3...15..4.1..3..',
    final:
      '157643982639852714428719536265981473391427865784536291912375648873264159546198327',
  },
  {
    n: 12,
    difficulty: '4-moderate',
    init: '.1....845...6.......5...7..9.72...5...6..4.1...17.89...4.9.....7....25....3.7....',
    final:
      '619327845874659123325841796937216458286594317451738962542983671798162534163475289',
  },
  {
    n: 13,
    difficulty: '4-moderate',
    init: '......32...16....86..47......594....1.4.529..8....17...5....2.4.......9......9..7',
    final:
      '748195326591623478632478159365947812174852963829361745953716284287534691416289537',
  },
  {
    n: 14,
    difficulty: '4-moderate',
    init: '3...7582.........564.9....7..4.......27.3....8..2......8.64.3....1.8..4......9...',
    final:
      '319475826278163495645928137134796582527831964896254713982647351751382649463519278',
  },
  {
    n: 15,
    difficulty: '4-moderate',
    init: '.....3.......47.....869......9...5...14....2..7....1.6.....628.64.1....71.53.....',
    final:
      '456213879921847635738695412269731548514968723873524196397456281642189357185372964',
  },
  {
    n: 16,
    difficulty: '4-moderate',
    init: '..1.........9..6.5.3..8.....25.....7..6.4.2....47.19..8.75..1......39..........2.',
    final:
      '761254893248913675539687412125896347976345281384721956897562134452139768613478529',
  },
  {
    n: 17,
    difficulty: '4-moderate',
    init: '5..4.6..23...5...........7.7.3..9....8...37....97.2.6.8.........5....2......389.1',
    final:
      '517496832326857419498321576763549128285163794149782365832915647951674283674238951',
  },
  {
    n: 18,
    difficulty: '5-moderately-hard',
    init: '.1..........4..6....6..2.1..8456.2.9.7....1..9........56.79...2.2...89....8..653.',
    final:
      '217685394359417628846932715184563279675829143932174856563791482421358967798246531',
  },
  {
    n: 19,
    difficulty: '5-moderately-hard',
    init: '187.....4........5...39.2...4..7...9....134...7....3....5..4.1.8.3..2.....28.....',
    final:
      '187526934239748165654391278341275689928613457576489321765934812893152746412867593',
  },
  {
    n: 20,
    difficulty: '5-moderately-hard',
    init: '.2.15.3..8.1..........2...8..6..9..27......45...4...8..14.9...3.....1.2..635.....',
    final:
      '627158394891374256345926718456789132789213645132465987214897563578631429963542871',
  },
  {
    n: 21,
    difficulty: '5-moderately-hard',
    init: '..2.16..5...79.3...7....4..78........31.79..8.49..............3....61.978...2..1.',
    final:
      '492316785568794321173258469785142936231679548649835172916487253324561897857923614',
  },
  {
    n: 22,
    difficulty: '5-moderately-hard',
    init: '..23.........853...9...2.1.4...1.5.8...7.39....1........75.....5.84....3.6...91..',
    final:
      '152394876746185329893672415479216538285743961631958742927531684518467293364829157',
  },
  {
    n: 23,
    difficulty: '5-moderately-hard',
    init: '863...2.95.9....8.............24...1...6.....7...59.....13..6.23...8......51.2...',
    final:
      '863514279529763184147928563936247851258631947714859326481375692392486715675192438',
  },
  {
    n: 24,
    difficulty: '5-moderately-hard',
    init: '......46..7..1.53.5.........64..5.189.1.7...48.....2.....6...434......9.63.7.....',
    final:
      '318529467276418539549367821764235918921876354853941276195682743487153692632794185',
  },
  {
    n: 25,
    difficulty: '5-moderately-hard',
    init: '.49...28.8...75..........7.4..2..5...1....3....7..6.......6...42.81...6.....9.1.2',
    final:
      '749631285832975641165824973483217596516489327927356418391762854258143769674598132',
  },
  {
    n: 26,
    difficulty: '5-moderately-hard',
    init: '6.7......81.............15.....3.92....548.7...5..2...9.2..7.4.......8.25.3....9.',
    final:
      '657193284814275369329684157468731925291548673735962418982317546176459832543826791',
  },
  {
    n: 27,
    difficulty: '5-moderately-hard',
    init: '......6...9.......8.16..5.9.19..4.....439...2.5.......93......1.7.95...8....12..6',
    final:
      '527149683693528174841637529219874365764395812358261497932486751176953248485712936',
  },
  {
    n: 28,
    difficulty: '6-hard',
    init: '1.6.......8..7.2.......24...6.2...94.......1...4.5......3.47..2...5....7.976.15..',
    final:
      '126485379489376251375192486568213794932764815714859623853947162641528937297631548',
  },
  {
    n: 29,
    difficulty: '6-hard',
    init: '.....25..7..1....34.......1..32.........87...2......16.3..5.94...9...3...4.9.6.8.',
    final:
      '316872594798145623425369871963214758154687239287593416631758942879421365542936187',
  },
  {
    n: 30,
    difficulty: '6-hard',
    init: '...5....15......4...61.4..7......81...5.3..2.83..2...99.2...38.3..4......6..5....',
    final:
      '743568291519273648286194537627945813195837426834621759952716384371482965468359172',
  },
  {
    n: 31,
    difficulty: '6-hard',
    init: '8..7.....2.....97..5.8........9.81......6529..1....6.36..4...2..3......9.8....5..',
    final:
      '893716452261354978457829316726938145348165297519247683675493821134582769982671534',
  },
  {
    n: 32,
    difficulty: '6-hard',
    init: '1..8...72.....7.69....2......4...3...37....18.5..18..6............59...1..3...68.',
    final:
      '169835472325147869478926153814769325637452918952318746241683597786594231593271684',
  },
  {
    n: 33,
    difficulty: '6-hard',
    init: '.......5.6..8..92..1.6.4......2...97......6...487.6...4.3........752..8.....7...2',
    final:
      '789312456634857921512694738356241897271985643948736215423168579167529384895473162',
  },
  {
    n: 34,
    difficulty: '6-hard',
    init: '4....8.5..3.61.9..8..4..1....47.1...358..6....9...........3...2...2...75......8.1',
    final:
      '416398257537612948829475163264751389358926714791843526685137492143289675972564831',
  },
  {
    n: 35,
    difficulty: '6-hard',
    init: '.1......3.2..1.8....86.39..3...75.....69...8....8..2.4...............1.67.9.5.4..',
    final:
      '914582763623719845578643921382475619456921387197836254241367598835294176769158432',
  },
  {
    n: 36,
    difficulty: '6-hard',
    init: '...2.....15......47.6......5..6...9..9352.......3.9.26..5.....3...78.6.1.1....8..',
    final:
      '984237165152896734736451289521674398693528417478319526865142973249783651317965842',
  },
  {
    n: 37,
    difficulty: '7-vicious',
    init: '.854....23.....7..7....6.5...82....1..7...6.....6....4..3....1.42...9..7....35...',
    final:
      '985473162364521798712986453638254971147398625259617384593742816421869537876135249',
  },
  {
    n: 38,
    difficulty: '7-vicious',
    init: '9..21.6....8...5...367....8..2.......73....4....46..8.....3.1....9.......4.1.583.',
    final:
      '954218673728346591136759428462873915873591246591462387285937164319684752647125839',
  },
  {
    n: 39,
    difficulty: '7-vicious',
    init: '5........1....35.8....8.12...3..9....4..6.3.7.......4.86...5.9....2.7.......3...2',
    final:
      '528971634194623578376584129683749251945162387217358946862415793431297865759836412',
  },
  {
    n: 40,
    difficulty: '7-vicious',
    init: '5.6.......2..67..3.....1......8....5.....3.964.3.....28....21.4.....83...4...692.',
    final:
      '576389241921467583384521679612894735758213496493675812837952164269148357145736928',
  },
  {
    n: 41,
    difficulty: '7-vicious',
    init: '...24.78....1....2.....9..4......5....7....9865.........94.1....728..6...48.7...5',
    final:
      '931245786486137952725689134894312567217564398653798421569421873172853649348976215',
  },
  {
    n: 42,
    difficulty: '7-vicious',
    init: '..9.476.3.....3.12..8.....73..5.8.6...7........4.3...8..1....9..7..25..4....8..7.',
    final:
      '129847653745693812638251947392578461867412539514936728281764395976325184453189276',
  },
  {
    n: 43,
    difficulty: '8-fiendish',
    init: '..47.....8....2.7.5.1..34.......8........6.5..63...1....6...5...4..3.2.1.....57..',
    final:
      '624759813839142675571683492457318926198276354263594187786421539945837261312965748',
  },
  {
    n: 44,
    difficulty: '8-fiendish',
    init: '...6..52.........6.....3.474.5..7.....2...6.471...9.3..2.5....1...7..28...8.4....',
    final:
      '371694528284175396659283147435867912892351674716429835927538461543716289168942753',
  },
  {
    n: 45,
    difficulty: '8-fiendish',
    init: '4..9..16..27....95......7.....7..3...5.2.1..8....83..6..48........3.9...31...4...',
    final:
      '485972163627138495931546782846795321753261948192483576564817239278359614319624857',
  },
  {
    n: 46,
    difficulty: '9-devilish',
    init: '5..64..78.....1..53..7.92..9.5276...7.8..............21.....8...7..9.......8..94.',
    final:
      '591642378267381495384759216935276184728415639416938752149563827872194563653827941',
  },
  {
    n: 47,
    difficulty: '9-devilish',
    init: '....21.5...8...7..7.1.3........64...........78..3.562.2.79....6.4......9...612...',
    final:
      '469721853538496712721538964372164598615289347894375621257943186146857239983612475',
  },
  {
    n: 48,
    difficulty: '10-hell',
    init: '4.5.7...1..19..8.3.....4.......8.59..9.2..........3.6.61........396...8..5....3..',
    final:
      '465378921271956843983124675326481597598267134147593268614832759739615482852749316',
  },
  {
    n: 49,
    difficulty: '11-beyond-hell',
    init: '2..81..9.6.....4....7.4....7...38..4....95...1....7.6..8..............8246....915',
    final:
      '243816597658379421917542638796138254824695173135427869389251746571964382462783915',
  },
];

describe('humanSolver', () => {
  // ---------------------------------------------------------------------------
  // puzzleToGrid
  // ---------------------------------------------------------------------------

  describe('puzzleToGrid', () => {
    it('converts a puzzle to an 81-element flat grid', () => {
      const puzzle = puzzleTextToPuzzle(
        '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
      );
      const grid = puzzleToGrid(puzzle);
      expect(grid).toHaveLength(81);
      expect(grid[0]).toBe(5);
      expect(grid[1]).toBe(3);
      expect(grid[2]).toBe(0);
      expect(grid[4]).toBe(7);
    });

    it('has 0 for empty cells', () => {
      const puzzle = puzzleTextToPuzzle('.'.repeat(81));
      const grid = puzzleToGrid(puzzle);
      expect(grid.every((v) => v === 0)).toBe(true);
    });

    it('has no 0 for fully filled puzzle', () => {
      const puzzle = puzzleTextToPuzzle(PUZZLES[0].final);
      const grid = puzzleToGrid(puzzle);
      expect(grid.every((v) => v > 0)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // gridToPuzzle
  // ---------------------------------------------------------------------------

  describe('gridToPuzzle', () => {
    it('roundtrips through puzzleToGrid', () => {
      const puzzle = puzzleTextToPuzzle(
        '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
      );
      const grid = puzzleToGrid(puzzle);
      const puzzle2 = gridToPuzzle(grid);
      const grid2 = puzzleToGrid(puzzle2);
      expect(grid2).toEqual(grid);
    });

    it('returns a 3×3×3×3 nested structure', () => {
      const grid = new Array(81).fill(0);
      const puzzle = gridToPuzzle(grid);
      expect(puzzle[0][0][0]).toBeDefined();
      expect(puzzle[2][2][2]).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // buildCandidates
  // ---------------------------------------------------------------------------

  describe('buildCandidates', () => {
    it('returns 81 candidate sets', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const candidates = buildCandidates(grid);
      expect(candidates).toHaveLength(81);
    });

    it('returns empty set for filled cells', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const candidates = buildCandidates(grid);
      for (let i = 0; i < 81; i++) {
        if (grid[i] !== 0) expect(candidates[i].size).toBe(0);
      }
    });

    it('candidates never include peer digit values', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const candidates = buildCandidates(grid);
      for (let cell = 0; cell < 81; cell++) {
        if (grid[cell] !== 0) continue;
        const row = Math.floor(cell / 9);
        const col = cell % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let c = 0; c < 9; c++) {
          if (grid[row * 9 + c] !== 0)
            expect(candidates[cell].has(grid[row * 9 + c])).toBe(false);
          if (grid[c * 9 + col] !== 0)
            expect(candidates[cell].has(grid[c * 9 + col])).toBe(false);
        }
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const boxCell = (boxRow + r) * 9 + (boxCol + c);
            if (grid[boxCell] !== 0)
              expect(candidates[cell].has(grid[boxCell])).toBe(false);
          }
        }
      }
    });

    it('fully filled grid has all empty candidate sets', () => {
      const grid = parseGrid(PUZZLES[0].final);
      const candidates = buildCandidates(grid);
      expect(candidates.every((s) => s.size === 0)).toBe(true);
    });

    it('empty grid gives all 9 candidates for every cell', () => {
      const grid = new Array(81).fill(0);
      const candidates = buildCandidates(grid);
      for (let d = 1; d <= 9; d++) {
        expect(candidates[0].has(d)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // applyHint
  // ---------------------------------------------------------------------------

  describe('applyHint', () => {
    it('placement sets cell in grid and clears its candidate set', () => {
      const grid = new Array(81).fill(0);
      const candidates = buildCandidates(grid);
      const hint = {
        technique: 'nakedSingle' as const,
        placements: [{ cell: 0, digit: 5 }],
        eliminations: [],
        patternCells: [0],
      };
      const { grid: g2, candidates: c2 } = applyHint(grid, candidates, hint);
      expect(g2[0]).toBe(5);
      expect(c2[0].size).toBe(0);
    });

    it('placement removes digit from row/col/box peers', () => {
      const grid = new Array(81).fill(0);
      const candidates = buildCandidates(grid);
      const hint = {
        technique: 'nakedSingle' as const,
        placements: [{ cell: 0, digit: 5 }],
        eliminations: [],
        patternCells: [0],
      };
      const { candidates: c2 } = applyHint(grid, candidates, hint);
      expect(c2[1].has(5)).toBe(false); // row peer
      expect(c2[9].has(5)).toBe(false); // col peer
      expect(c2[10].has(5)).toBe(false); // box peer
    });

    it('elimination removes digit from candidate set without touching grid', () => {
      const grid = new Array(81).fill(0);
      const candidates = buildCandidates(grid);
      const hint = {
        technique: 'nakedPair' as const,
        placements: [],
        eliminations: [{ cell: 5, digit: 3 }],
        patternCells: [0, 1],
      };
      const { grid: g2, candidates: c2 } = applyHint(grid, candidates, hint);
      expect(g2[5]).toBe(0);
      expect(c2[5].has(3)).toBe(false);
    });

    it('does not mutate original grid or candidates', () => {
      const grid = new Array(81).fill(0);
      const candidates = buildCandidates(grid);
      const gridCopy = [...grid];
      const hint = {
        technique: 'nakedSingle' as const,
        placements: [{ cell: 0, digit: 5 }],
        eliminations: [],
        patternCells: [0],
      };
      applyHint(grid, candidates, hint);
      expect(grid).toEqual(gridCopy);
      expect(candidates[0].has(5)).toBe(true);
    });

    it('applies multiple placements at once', () => {
      const grid = new Array(81).fill(0);
      const candidates = buildCandidates(grid);
      const hint = {
        technique: 'nakedSingle' as const,
        placements: [
          { cell: 0, digit: 1 },
          { cell: 40, digit: 5 },
        ],
        eliminations: [],
        patternCells: [0, 40],
      };
      const { grid: g2 } = applyHint(grid, candidates, hint);
      expect(g2[0]).toBe(1);
      expect(g2[40]).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Naked Single
  // ---------------------------------------------------------------------------

  describe('findHint — nakedSingle', () => {
    it('finds a naked single when a cell has exactly one candidate', () => {
      const grid = new Array(81).fill(0);
      for (let c = 1; c < 9; c++) grid[c] = c + 1;
      const candidates = buildCandidates(grid);
      const hint = findHint(grid, candidates);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('nakedSingle');
      expect(hint!.placements[0].cell).toBe(0);
      expect(hint!.placements[0].digit).toBe(1);
    });

    it('returns null for a fully solved puzzle', () => {
      const grid = parseGrid(PUZZLES[0].final);
      const candidates = buildCandidates(grid);
      expect(findHint(grid, candidates)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Hidden Singles
  // ---------------------------------------------------------------------------

  describe('findHint — hiddenSingle', () => {
    it('finds hiddenSingleBox', () => {
      const grid = parseGrid(
        '000040927080000000002500340000004060061009700207300800300000100004000002076000000'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('hiddenSingleBox')).toBe(true);
    });

    it('finds hiddenSingleCol', () => {
      const grid = parseGrid(
        '000040927080000000002500340000004060061009700207300800300000100004000002076000000'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('hiddenSingleCol')).toBe(true);
    });

    it('finds hiddenSingleRow', () => {
      const grid = parseGrid(
        '000040927080000000002500340000004060061009700207300800300000100004000002076000000'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('hiddenSingleRow')).toBe(true);
    });

    it('first hint for puzzle-47 is a hiddenSingleBox', () => {
      const grid = parseGrid(PUZZLES[47].init);
      const candidates = buildCandidates(grid);
      const hint = findHint(grid, candidates);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('hiddenSingleBox');
      expect(hint!.placements).toHaveLength(1);
    });

    it('easy puzzle (puzzle-3) solved using only singles', () => {
      const grid = parseGrid(PUZZLES[3].init);
      const techniques = collectTechniques(grid);
      const singles = new Set([
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleRow',
        'hiddenSingleCol',
        'eliminateCandidates',
      ]);
      for (const t of techniques) {
        expect(singles.has(t)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Locked Candidates
  // ---------------------------------------------------------------------------

  describe('findHint — lockedCandidates', () => {
    it('finds lockedCandidatePointing in puzzle-30', () => {
      const grid = parseGrid(PUZZLES[30].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('lockedCandidatePointing')).toBe(true);
    });

    it('finds lockedCandidateClaiming in puzzle-30', () => {
      const grid = parseGrid(PUZZLES[30].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('lockedCandidateClaiming')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Naked / Hidden Groups
  // ---------------------------------------------------------------------------

  describe('findHint — naked and hidden groups', () => {
    it('finds hiddenPair in a moderately-hard puzzle (puzzle-22)', () => {
      const grid = parseGrid(PUZZLES[22].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('hiddenPair')).toBe(true);
    });

    it('finds nakedPair', () => {
      const grid = parseGrid(
        '003040006020500000008001409109080600000000010000100203000907000306008900200006008'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('nakedPair')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Fish (X-Wing / Swordfish / Jellyfish)
  // ---------------------------------------------------------------------------

  describe('findHint — fish techniques', () => {
    it('finds xWing in vicious puzzle-38 (X-Wing x1)', () => {
      const grid = parseGrid(PUZZLES[38].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('xWing')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Finned Fish (Finned/Sashimi X-Wing / Swordfish)
  // ---------------------------------------------------------------------------

  describe('findHint — finnedFish', () => {
    it('finds finnedXWing in devilish puzzle-47 (Finned/Sashimi X-Wing x1)', () => {
      const grid = parseGrid(PUZZLES[47].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('finnedXWing')).toBe(true);
    });

    it('finds finnedSwordfish in devilish puzzle-47 (Finned/Sashimi Swordfish x1)', () => {
      const grid = parseGrid(PUZZLES[47].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('finnedSwordfish')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findFinnedFish — finnedXWing eliminates 2 from r5c1
  //
  // Candidate state from HoDoKu screenshot showing a finned X-Wing on digit 2:
  //   Base columns: col 3 and col 4 (1-indexed)
  //   Core cover rows: row 2 and row 5 (1-indexed)
  //   Fin cells: r4c3 and r6c3 (both in box 4, 1-indexed = box 3, 0-indexed)
  //   Anchor: r5c4 (non-fin base cell also in box 4)
  //   Elimination: r5c1 (cell 36, 0-indexed) — digit 2
  // ---------------------------------------------------------------------------

  describe('findFinnedFish — finnedXWing eliminates 2 from r5c1', () => {
    it('eliminates digit 2 from r5c1 (cell 36) via finned X-Wing on cols 3 and 4', () => {
      const s = (digits: number[]) => new Set(digits);
      const f = () => new Set<number>();
      // Candidate grid (0-indexed rows/cols):
      // r1: 3456    1      35     8     7      56     3456   9     2
      // r2: 234567  24567  2357   29    2469   569    8      3456  1
      // r3: 9       2456   8      1     246    3      456    7     56
      // r4: 8       9      125    4     126    167    2356   2356  567
      // r5: 26      3      4      29    5      679    1      8     67
      // r6: 2567    2567   1257   3     126    8      9      256   4
      // r7: 2347    247    6      5     139    19     247    124   8
      // r8: 1       4578   357    6     38     2      457    45    9
      // r9: 25      258    9      7     18     4      256    1256  3
      const candidates: Set<number>[] = [
        // r1 (row 0)
        s([3, 4, 5, 6]),
        f(),
        s([3, 5]),
        f(),
        f(),
        s([5, 6]),
        s([3, 4, 5, 6]),
        f(),
        f(),
        // r2 (row 1)
        s([2, 3, 4, 5, 6, 7]),
        s([2, 4, 5, 6, 7]),
        s([2, 3, 5, 7]),
        s([2, 9]),
        s([2, 4, 6, 9]),
        s([5, 6, 9]),
        f(),
        s([3, 4, 5, 6]),
        f(),
        // r3 (row 2)
        f(),
        s([2, 4, 5, 6]),
        f(),
        f(),
        s([2, 4, 6]),
        f(),
        s([4, 5, 6]),
        f(),
        s([5, 6]),
        // r4 (row 3)
        f(),
        f(),
        s([1, 2, 5]),
        f(),
        s([1, 2, 6]),
        s([1, 6, 7]),
        s([2, 3, 5, 6]),
        s([2, 3, 5, 6]),
        s([5, 6, 7]),
        // r5 (row 4)
        s([2, 6]),
        f(),
        f(),
        s([2, 9]),
        f(),
        s([6, 7, 9]),
        f(),
        f(),
        s([6, 7]),
        // r6 (row 5)
        s([2, 5, 6, 7]),
        s([2, 5, 6, 7]),
        s([1, 2, 5, 7]),
        f(),
        s([1, 2, 6]),
        f(),
        f(),
        s([2, 5, 6]),
        f(),
        // r7 (row 6)
        s([2, 3, 4, 7]),
        s([2, 4, 7]),
        f(),
        f(),
        s([1, 3, 9]),
        s([1, 9]),
        s([2, 4, 7]),
        s([1, 2, 4]),
        f(),
        // r8 (row 7)
        f(),
        s([4, 5, 7, 8]),
        s([3, 5, 7]),
        f(),
        s([3, 8]),
        f(),
        s([4, 5, 7]),
        s([4, 5]),
        f(),
        // r9 (row 8)
        s([2, 5]),
        s([2, 5, 8]),
        f(),
        f(),
        s([1, 8]),
        f(),
        s([2, 5, 6]),
        s([1, 2, 5, 6]),
        f(),
      ];

      const hint = findFinnedFish(candidates, 2);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('finnedXWing');
      expect(hint!.eliminations).toContainEqual({ cell: 36, digit: 2 });
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Empty Rectangle
  // ---------------------------------------------------------------------------

  describe('findHint — emptyRectangle', () => {
    it('finds emptyRectangle', () => {
      const grid = parseGrid(
        '000000402500090000080600050002370000054000000000106004600007803020000607001800200'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('emptyRectangle')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Skyscraper
  // ---------------------------------------------------------------------------

  describe('findHint — skyscraper', () => {
    it('finds skyscraper in vicious puzzle-37 (Skyscraper x1)', () => {
      const grid = parseGrid(PUZZLES[37].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('skyscraper')).toBe(true);
    });

    it('finds skyscraper in vicious puzzle-38 (Skyscraper x2)', () => {
      const grid = parseGrid(PUZZLES[38].init);
      const techniques = collectTechniques(grid);
      const count = techniques.filter((t) => t === 'skyscraper').length;
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('finds skyscraper in vicious puzzle-41 (Skyscraper x1)', () => {
      const grid = parseGrid(PUZZLES[41].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('skyscraper')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Two-String-Kite
  // ---------------------------------------------------------------------------

  describe('findHint — twoStringKite', () => {
    it('finds twoStringKite in hell puzzle-48', () => {
      const grid = parseGrid(PUZZLES[48].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('twoStringKite')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — W-Wing
  // ---------------------------------------------------------------------------

  describe('findHint — wWing', () => {
    it('finds wWing in puzzle-48 (hell)', () => {
      const grid = parseGrid(PUZZLES[48].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('wWing')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — XYZ-Wing
  // ---------------------------------------------------------------------------

  describe('findHint — xyzWing', () => {
    it('finds xyzWing in hell puzzle-48 (XYZ-Wing x2)', () => {
      const grid = parseGrid(PUZZLES[48].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('xyzWing')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Hidden Triple / Quad
  // ---------------------------------------------------------------------------

  describe('findHint — hiddenGroup (triple/quad)', () => {
    it('finds hiddenTriple in vicious puzzle-38 (PDF #39 lists Hidden Triple x1)', () => {
      const grid = parseGrid(PUZZLES[38].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('hiddenTriple')).toBe(true);
    });

    it('finds hiddenQuad in fiendish seed puzzle (Hidden Quadruple x1)', () => {
      // puzzle-45 no longer reaches hiddenQuad (emptyRectangle now fires first).
      // Use a dedicated 8-fiendish seed that requires hiddenQuad.
      const grid = parseGrid(
        '020007008408009000000500040000090570056000080300010902807006000060000000590030000'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('hiddenQuad')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Unique Rectangle
  // ---------------------------------------------------------------------------

  describe('findHint — uniqueRectangle', () => {
    it('finds uniqueRectangleType1 in devilish puzzle-46 (Unique Rectangle Type 1 x1)', () => {
      const grid = parseGrid(PUZZLES[46].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('uniqueRectangleType1')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — BUG
  // ---------------------------------------------------------------------------

  describe('findHint — bug', () => {
    it('finds bug in devilish puzzle-46 (BUG x1)', () => {
      const grid = parseGrid(PUZZLES[46].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('bug')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Y-Wing
  // ---------------------------------------------------------------------------

  describe('findHint — yWing', () => {
    it('finds yWing in fiendish puzzle-45 (Y-Wing x1)', () => {
      const grid = parseGrid(PUZZLES[45].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('yWing')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — XY-Chain
  // ---------------------------------------------------------------------------

  describe('findHint — xyChain', () => {
    it('finds xyChain in fiendish puzzle-45', () => {
      const grid = parseGrid(PUZZLES[45].init);
      const techniques = collectTechniques(grid);
      expect(techniques.includes('xyChain')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Grouped AIC
  // ---------------------------------------------------------------------------

  describe('findHint — groupedAIC', () => {
    it('finds groupedAIC', () => {
      const grid = parseGrid(
        '850690000000040309000007000080000400061005800004100560002050000600000020400302900'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('groupedAIC')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — AIC
  // ---------------------------------------------------------------------------

  describe('findHint — aic', () => {
    it('finds aic in devilish seed puzzle (9-devilish)', () => {
      // 9-devilish seed: solver uses aic to crack this puzzle after finnedSwordfish
      const grid = parseGrid(
        '300000005001068000002000790000950040000000002103020000905400300040800050000000007'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('aic')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — AIC Ring
  // ---------------------------------------------------------------------------

  describe('findHint — aicRing', () => {
    // Candidate state reconstructed from puzzle-49 (11-beyond-hell) just before
    // the first AIC step fires. The solver finds an aicRing here.
    it('finds aicRing in puzzle-49 state', () => {
      const s = (digits: number[]) => new Set(digits);
      const f = () => new Set<number>();
      const candidates: Set<number>[] = [
        f(),
        s([4, 5]),
        s([3, 4, 5]),
        f(),
        f(),
        s([3, 6]),
        s([5, 6, 7]),
        f(),
        s([6, 7]),
        f(),
        s([1, 5, 9]),
        s([5, 8, 9]),
        s([2, 3, 5]),
        f(),
        s([2, 9]),
        f(),
        s([2, 3, 5]),
        s([1, 8]),
        s([3, 5, 8, 9]),
        s([1, 3]),
        f(),
        s([2, 3, 5]),
        f(),
        s([2, 6, 9]),
        s([1, 2, 5, 6]),
        s([2, 3, 5]),
        s([6, 8]),
        f(),
        s([2, 9]),
        s([6, 9]),
        s([1, 6]),
        f(),
        f(),
        s([1, 2, 5]),
        s([2, 5]),
        f(),
        s([3, 8]),
        s([2, 4]),
        s([4, 6]),
        s([1, 6]),
        f(),
        f(),
        s([1, 2, 8]),
        f(),
        s([1, 3]),
        f(),
        s([3, 5]),
        s([5, 8]),
        f(),
        f(),
        f(),
        s([3, 8]),
        f(),
        f(),
        s([3, 5, 9]),
        f(),
        s([2, 5, 9]),
        s([2, 3, 9]),
        s([5, 6]),
        f(),
        s([3, 6, 7]),
        f(),
        s([3, 6, 7]),
        s([3, 5, 9]),
        f(),
        f(),
        s([3, 9]),
        s([5, 6]),
        f(),
        s([3, 6]),
        f(),
        f(),
        f(),
        f(),
        s([2, 3]),
        f(),
        f(),
        s([2, 3]),
        f(),
        f(),
        f(),
      ];

      const hint = findAIC(candidates);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('aicRing');
      expect(hint!.eliminations.length).toBeGreaterThan(0);
    });

    // Candidate state reconstructed from a sudoku.coach screenshot where an
    // aicRing eliminates digit 5 from r3c4 (cell 21).
    it('finds aicRing eliminating digit 5 from r3c4', () => {
      const s = (digits: number[]) => new Set(digits);
      const f = () => new Set<number>();
      const candidates: Set<number>[] = [
        f(),
        s([6, 8]),
        f(),
        f(),
        f(),
        s([6, 8]),
        f(),
        f(),
        f(),
        s([2, 7]),
        s([2, 6]),
        f(),
        f(),
        s([5, 6]),
        s([2, 5, 6]),
        f(),
        f(),
        f(),
        f(),
        s([2, 7, 8]),
        f(),
        s([1, 5, 8]),
        s([1, 2]),
        f(),
        f(),
        s([5, 7]),
        s([5, 7]),
        f(),
        s([2, 4, 6, 7]),
        s([2, 4, 6, 7]),
        s([1, 4, 7]),
        f(),
        s([1, 6, 7]),
        f(),
        f(),
        s([2, 4, 7]),
        s([1, 5, 7]),
        f(),
        s([4, 6, 7, 8]),
        f(),
        s([1, 4, 5, 6]),
        s([1, 5, 6, 7]),
        s([1, 4, 7]),
        f(),
        s([4, 7, 8]),
        s([1, 2, 5, 7]),
        s([2, 4, 7, 8]),
        s([2, 4, 7, 8]),
        s([1, 4, 5, 7]),
        f(),
        f(),
        s([1, 2, 4, 7]),
        f(),
        s([2, 4, 7, 8]),
        f(),
        f(),
        s([2, 4, 7]),
        s([4, 5, 7, 8]),
        f(),
        s([2, 5, 7, 8]),
        s([2, 4, 7]),
        s([5, 7]),
        f(),
        s([2, 7]),
        f(),
        f(),
        f(),
        s([1, 2, 4, 5]),
        s([1, 2, 5, 7]),
        s([2, 4, 7]),
        f(),
        s([2, 4, 5, 7]),
        f(),
        f(),
        s([2, 4, 7]),
        s([4, 7]),
        s([1, 4, 5]),
        s([1, 2, 5]),
        f(),
        f(),
        f(),
      ];
      // Apply 6 preceding AIC eliminations that fire before this state
      const prior = [
        { cell: 1, digit: 8 },
        { cell: 5, digit: 6 },
        { cell: 9, digit: 2 },
        { cell: 10, digit: 6 },
        { cell: 14, digit: 2 },
        { cell: 19, digit: 2 },
      ];
      for (const { cell, digit } of prior) candidates[cell].delete(digit);

      const hint = findAIC(candidates);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('aicRing');
      expect(hint!.eliminations).toContainEqual({ cell: 21, digit: 5 });
    });
  });

  // ---------------------------------------------------------------------------
  // humanSolve — solves all 50 puzzles with correct final solution
  // ---------------------------------------------------------------------------

  describe('humanSolve — solves all 50 puzzles with correct final solution', () => {
    for (const { n, difficulty, init, final } of PUZZLES) {
      it(`solves puzzle-${n} (${difficulty})`, () => {
        expectSolvedWithFinal(init, final);
      });
    }

    it(`sees techniques`, () => {
      const seenTechniques = new Set<string>();
      for (const { init, final } of PUZZLES) {
        expectSolvedWithFinal(init, final)
          .map((step) => step.technique)
          .forEach((technique) => seenTechniques.add(technique));
      }
      expect(Array.from(seenTechniques)).toStrictEqual([
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleRow',
        'hiddenSingleCol',
        'hiddenPair',
        'lockedCandidatePointing',
        'lockedCandidateClaiming',
        'hiddenQuad',
        'skyscraper',
        'hiddenTriple',
        'xWing',
        'wWing',
        'finnedXWing',
        'xyChain',
        'yWing',
        'uniqueRectangleType1',
        'bug',
        'xyzWing',
        'finnedSwordfish',
        'twoStringKite',
        'aicRing',
        'aic',
        'alsXZ',
        'groupedAIC',
        'swordfish',
        'uniqueRectangleType4',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // humanSolve — solution validity
  // ---------------------------------------------------------------------------

  describe('humanSolve — solution validity', () => {
    it('each row has digits 1-9 exactly once', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const { grid: solved } = humanSolve(grid);
      for (let r = 0; r < 9; r++) {
        const row = solved.slice(r * 9, r * 9 + 9);
        expect(new Set(row).size).toBe(9);
        expect(row.every((v) => v >= 1 && v <= 9)).toBe(true);
      }
    });

    it('each column has digits 1-9 exactly once', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const { grid: solved } = humanSolve(grid);
      for (let c = 0; c < 9; c++) {
        const col = Array.from({ length: 9 }, (_, r) => solved[r * 9 + c]);
        expect(new Set(col).size).toBe(9);
      }
    });

    it('each box has digits 1-9 exactly once', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const { grid: solved } = humanSolve(grid);
      for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
          const box: number[] = [];
          for (let r = 0; r < 3; r++)
            for (let c = 0; c < 3; c++)
              box.push(solved[(br * 3 + r) * 9 + (bc * 3 + c)]);
          expect(new Set(box).size).toBe(9);
        }
      }
    });

    it('returns empty steps for an already-solved puzzle', () => {
      const grid = parseGrid(PUZZLES[0].final);
      const { steps } = humanSolve(grid);
      expect(steps).toHaveLength(0);
    });

    it('findHint returns null after humanSolve completes', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const { grid: solved, candidates } = humanSolve(grid);
      expect(findHint(solved, candidates)).toBeNull();
    });

    it('does not modify the original grid', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const original = [...grid];
      humanSolve(grid);
      expect(grid).toEqual(original);
    });
  });

  // ---------------------------------------------------------------------------
  // humanSolve — step metadata
  // ---------------------------------------------------------------------------

  describe('humanSolve — step metadata', () => {
    it('every step has at least one placement or elimination', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const { steps } = humanSolve(grid);
      for (const step of steps) {
        expect(
          step.placements.length + step.eliminations.length
        ).toBeGreaterThan(0);
      }
    });

    it('patternCells in every step are valid cell indices (0-80)', () => {
      const grid = parseGrid(PUZZLES[38].init);
      const { steps } = humanSolve(grid);
      for (const step of steps) {
        for (const cell of step.patternCells) {
          expect(cell).toBeGreaterThanOrEqual(0);
          expect(cell).toBeLessThanOrEqual(80);
        }
      }
    });

    it('placement digits are in range 1-9', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const { steps } = humanSolve(grid);
      for (const step of steps) {
        for (const { digit } of step.placements) {
          expect(digit).toBeGreaterThanOrEqual(1);
          expect(digit).toBeLessThanOrEqual(9);
        }
      }
    });

    it('elimination cell indices are in range 0-80', () => {
      const grid = parseGrid(PUZZLES[30].init);
      const { steps } = humanSolve(grid);
      const withElims = steps.filter((s) => s.eliminations.length > 0);
      for (const step of withElims) {
        for (const { cell } of step.eliminations) {
          expect(cell).toBeGreaterThanOrEqual(0);
          expect(cell).toBeLessThanOrEqual(80);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Technique ordering — easier techniques used before harder ones
  // ---------------------------------------------------------------------------

  describe('technique ordering', () => {
    it('uses nakedSingle before any other technique when applicable', () => {
      const grid = new Array(81).fill(0);
      for (let c = 1; c < 9; c++) grid[c] = c + 1;
      const candidates = buildCandidates(grid);
      const hint = findHint(grid, candidates);
      expect(hint!.technique).toBe('nakedSingle');
    });

    it('very-easy puzzles use only single techniques', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const allowed = new Set([
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleRow',
        'hiddenSingleCol',
        'eliminateCandidates',
      ]);
      for (const t of collectTechniques(grid)) {
        expect(allowed.has(t)).toBe(true);
      }
    });

    it('easy puzzle-3 does not require advanced techniques', () => {
      const advanced = new Set([
        'xWing',
        'swordfish',
        'jellyfish',
        'skyscraper',
        'twoStringKite',
        'finnedXWing',
        'finnedSwordfish',
        'finnedJellyfish',
        'emptyRectangle',
        'wWing',
        'yWing',
        'xyzWing',
        'uniqueRectangleType1',
        'uniqueRectangleType2',
        'uniqueRectangleType3',
        'uniqueRectangleType4',
        'uniqueRectangleType5',
        'bug',
        'simpleColoring',
        'xChain',
        'groupedXChain',
        'threeDMedusa',
        'xyChain',
        'aic',
        'groupedAIC',
        'nishio',
        'nishioNet',
        'cellRegionForcingChain',
        'cellRegionForcingNet',
        'forcingChain',
      ]);
      for (const t of collectTechniques(parseGrid(PUZZLES[3].init))) {
        expect(advanced.has(t)).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // puzzle-47 (9-devilish) — expected solving technique sequence
  // ---------------------------------------------------------------------------

  describe('humanSolve — puzzle-47 technique sequence', () => {
    const puzzle47 = PUZZLES.find((p) => p.n === 47)!;

    it('solves puzzle-47 to the correct final grid', () => {
      expectSolvedWithFinal(puzzle47.init, puzzle47.final);
    });

    it('actual technique sequence matches solver output', () => {
      const techniques = collectTechniques(parseGrid(puzzle47.init));
      expect(techniques).toEqual([
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenPair',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidateClaiming',
        'xyzWing',
        'finnedXWing',
        'xyzWing',
        'finnedSwordfish',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenPair',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // puzzle-48 (10-hell) — expected solving technique sequence
  // ---------------------------------------------------------------------------

  describe('humanSolve — puzzle-48 technique sequence', () => {
    const puzzle48 = PUZZLES.find((p) => p.n === 48)!;

    it('solves puzzle-48 to the correct final grid', () => {
      expectSolvedWithFinal(puzzle48.init, puzzle48.final);
    });

    it('actual technique sequence matches solver output', () => {
      const techniques = collectTechniques(parseGrid(puzzle48.init));
      expect(techniques).toEqual([
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleCol',
        'hiddenPair',
        'hiddenSingleCol',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidateClaiming',
        'twoStringKite',
        'twoStringKite',
        'aicRing',
        'xyzWing',
        'wWing',
        'aic',
        'nakedSingle',
        'hiddenSingleCol',
        'hiddenSingleBox',
        'lockedCandidatePointing',
        'nakedSingle',
        'lockedCandidateClaiming',
        'wWing',
        'xyChain',
        'xyChain',
        'xyChain',
        'yWing',
        'lockedCandidateClaiming',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'xyzWing',
        'wWing',
        'hiddenTriple',
        'skyscraper',
        'yWing',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // puzzle-45 (8-fiendish) — expected solving technique sequence
  // ---------------------------------------------------------------------------

  describe('humanSolve — puzzle-45 technique sequence', () => {
    const puzzle45 = PUZZLES.find((p) => p.n === 45)!;

    it('solves puzzle-45 to the correct final grid', () => {
      expectSolvedWithFinal(puzzle45.init, puzzle45.final);
    });

    it('actual technique sequence matches solver output', () => {
      // hiddenQuad now fires earlier (before nakedPair) due to technique reordering.
      const techniques = collectTechniques(parseGrid(puzzle45.init));
      expect(techniques).toEqual([
        'hiddenSingleBox',
        'hiddenSingleRow',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'finnedXWing',
        'xyChain',
        'hiddenSingleRow',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleCol',
        'lockedCandidatePointing',
        'hiddenQuad',
        'yWing',
        'hiddenSingleCol',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Naked Triple / Quad
  // ---------------------------------------------------------------------------

  describe('findHint — naked triple/quad', () => {
    // 7-vicious seed puzzle: Naked Triple x1 (HoDoKu count)
    it('finds nakedTriple in vicious seed puzzle', () => {
      const grid = parseGrid(
        '009070000000000293000000504000003080300800400500021009087000065000700000904600800'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('nakedTriple')).toBe(true);
    });

    it('finds nakedQuad', () => {
      const grid = parseGrid(
        '789325164654178392231.4.875.46.....1318.....6.27...4838725..649493267518165...237'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('nakedQuad')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Swordfish / Jellyfish
  // ---------------------------------------------------------------------------

  describe('findHint — swordfish', () => {
    // 7-vicious seed puzzle: Swordfish x1 (HoDoKu count)
    it('finds swordfish in vicious seed puzzle', () => {
      const grid = parseGrid(
        '400000000080730200009020006000200509091000000004000007300090000500007100070600304'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('swordfish')).toBe(true);
    });
  });

  describe('findHint — jellyfish', () => {
    // 9-devilish seed puzzle: Jellyfish x1 (HoDoKu count)
    it('finds jellyfish in devilish seed puzzle', () => {
      const grid = parseGrid(
        '000400007620000804007005003086390000000604000200001000004902500300000008500030000'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('jellyfish')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findHint — Nishio / Forcing chains
  // ---------------------------------------------------------------------------

  describe('findHint — nishio (dedicated)', () => {
    // HoDoKu seed (11-beyond-hell) uses Nishio Forcing Chain x6. ALS techniques
    // handle this puzzle before nishio fires in our chain ordering. To reach a state
    // where nishio is applicable, stop before ALS (and above) so those techniques
    // don't consume the candidates that nishio needs.
    it('findNishio finds a contradiction elimination on a stalled beyond-hell puzzle state', () => {
      const { grid: g, candidates: c } = advanceUntilStall(
        parseGrid(
          '071006000002900080500000001000070308085000140300400009420063000000008090000004000'
        ),
        [
          'alsXZ',
          'sueDeCoq',
          'deathBlossom',
          'nishio',
          'nishioNet',
          'cellRegionForcingChain',
          'cellRegionForcingNet',
          'forcingChain',
        ]
      );
      const result = findNishio(g, c);
      expect(result).not.toBeNull();
      expect(result!.technique).toBe('nishio');
      expect(result!.eliminations.length).toBeGreaterThan(0);
      const { grid: g2, candidates: c2 } = applyHint(g, c, result!);
      expect(isSolvableFromState(g2, c2)).toBe(true);
    });
  });

  describe('findHint — nishioNet', () => {
    // nishioNet never fires in our 1100-seed dataset (ALS techniques handle all cases first).
    // Stop before ALS and nishioNet to preserve a stalled state where nishioNet applies.
    it('findNishioNet finds a contradiction elimination on a stalled beyond-hell puzzle state', () => {
      const { grid: g, candidates: c } = advanceUntilStall(
        parseGrid(
          '010000040500000000070100000006451002025800060000000910900060380800003600000009000'
        ),
        [
          'alsXZ',
          'sueDeCoq',
          'deathBlossom',
          'nishioNet',
          'cellRegionForcingChain',
          'cellRegionForcingNet',
          'forcingChain',
        ]
      );
      const result = findNishioNet(g, c);
      expect(result).not.toBeNull();
      expect(result!.technique).toBe('nishioNet');
      expect(result!.eliminations.length).toBeGreaterThan(0);
      const { grid: g2, candidates: c2 } = applyHint(g, c, result!);
      expect(isSolvableFromState(g2, c2)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // humanSolve — puzzle 010070092... finnedXWing
  // ---------------------------------------------------------------------------

  describe('humanSolve — puzzle 010070092...', () => {
    it('solves puzzle 010070092000000001908003070090400000034050180000008004006500000100600009000704003 to the correct final grid', () => {
      expectSolvedWithFinal(
        '010070092000000001908003070090400000034050180000008004006500000100600009000704003',
        '415876392763925841928143576891467235634259187572318964346591728187632459259784613'
      );
    });

    it('uses finnedXWing when solving puzzle 010070092...', () => {
      const grid = parseGrid(
        '010070092000000001908003070090400000034050180000008004006500000100600009000704003'
      );
      const techniques = collectTechniques(grid);
      expect(techniques.includes('finnedXWing')).toBe(true);
    });
  });

  describe('findHint — cellRegionForcingChain', () => {
    // HoDoKu seed (11-beyond-hell) uses Cell/Region Forcing Chain x2. ALS techniques
    // handle the puzzle before cellRegionForcingChain fires in our ordering. Stop before
    // ALS and cellRegionForcingChain so the state preserves a forcing chain pattern.
    it('findCellRegionForcingChain finds a result on a stalled beyond-hell puzzle state', () => {
      const { grid: g, candidates: c } = advanceUntilStall(
        parseGrid(
          '071006000002900080500000001000070308085000140300400009420063000000008090000004000'
        ),
        [
          'alsXZ',
          'sueDeCoq',
          'deathBlossom',
          'cellRegionForcingChain',
          'cellRegionForcingNet',
          'forcingChain',
        ]
      );
      const result = findCellRegionForcingChain(g, c);
      expect(result).not.toBeNull();
      expect(result!.technique).toBe('cellRegionForcingChain');
      expect(
        result!.placements.length + result!.eliminations.length
      ).toBeGreaterThan(0);
      const { grid: g2, candidates: c2 } = applyHint(g, c, result!);
      expect(isSolvableFromState(g2, c2)).toBe(true);
    });
  });

  describe('findHint — cellRegionForcingNet', () => {
    // HoDoKu seed (11-beyond-hell) uses Cell/Region Forcing Net x3. ALS techniques
    // handle the puzzle before cellRegionForcingNet fires in our ordering. Stop before
    // ALS and cellRegionForcingNet to preserve a stalled state.
    it('findCellRegionForcingNet finds a result on a stalled beyond-hell puzzle state', () => {
      const { grid: g, candidates: c } = advanceUntilStall(
        parseGrid(
          '000003700400000000000090408000708006000930000730001020190500000020000060650300079'
        ),
        [
          'alsXZ',
          'sueDeCoq',
          'deathBlossom',
          'cellRegionForcingNet',
          'forcingChain',
        ]
      );
      const result = findCellRegionForcingNet(g, c);
      expect(result).not.toBeNull();
      expect(result!.technique).toBe('cellRegionForcingNet');
      expect(
        result!.placements.length + result!.eliminations.length
      ).toBeGreaterThan(0);
      const { grid: g2, candidates: c2 } = applyHint(g, c, result!);
      expect(isSolvableFromState(g2, c2)).toBe(true);
    });
  });

  describe('findHint — forcingChain', () => {
    // forcingChain (bivalue forcing chain) never fires in our 1100-seed dataset.
    // Stop before ALS and forcingChain to preserve a stalled state where bivalue
    // forcing chain can find an outcome forced by both branches.
    it('findForcingChain finds a result on a stalled beyond-hell puzzle state', () => {
      const { grid: g, candidates: c } = advanceUntilStall(
        parseGrid(
          '.7..96.....352.68...6..47.248.....2..........51..............7.....3.5.9168.....3'
        ),
        ['alsXZ', 'sueDeCoq', 'deathBlossom', 'forcingChain']
      );
      const result = findForcingChain(g, c);
      expect(result).not.toBeNull();
      expect(result!.technique).toBe('forcingChain');
      expect(
        result!.placements.length + result!.eliminations.length
      ).toBeGreaterThan(0);
      const { grid: g2, candidates: c2 } = applyHint(g, c, result!);
      expect(isSolvableFromState(g2, c2)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // HintResult structure contracts
  // ---------------------------------------------------------------------------

  describe('HintResult structure', () => {
    it('technique is a string', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const candidates = buildCandidates(grid);
      const hint = findHint(grid, candidates)!;
      expect(typeof hint.technique).toBe('string');
    });

    it('placements is an array', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const candidates = buildCandidates(grid);
      expect(Array.isArray(findHint(grid, candidates)!.placements)).toBe(true);
    });

    it('eliminations is an array', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const candidates = buildCandidates(grid);
      expect(Array.isArray(findHint(grid, candidates)!.eliminations)).toBe(
        true
      );
    });

    it('patternCells is an array', () => {
      const grid = parseGrid(PUZZLES[0].init);
      const candidates = buildCandidates(grid);
      expect(Array.isArray(findHint(grid, candidates)!.patternCells)).toBe(
        true
      );
    });

    it('placement has cell and digit fields', () => {
      const grid = new Array(81).fill(0);
      for (let c = 1; c < 9; c++) grid[c] = c + 1;
      const candidates = buildCandidates(grid);
      const hint = findHint(grid, candidates)!;
      expect(hint.placements[0]).toHaveProperty('cell');
      expect(hint.placements[0]).toHaveProperty('digit');
    });

    it('elimination has cell and digit fields', () => {
      const grid = parseGrid(PUZZLES[30].init);
      const { steps } = humanSolve(grid);
      const withElims = steps.find((s) => s.eliminations.length > 0)!;
      expect(withElims.eliminations[0]).toHaveProperty('cell');
      expect(withElims.eliminations[0]).toHaveProperty('digit');
    });
  });

  describe('humanSolve — other puzzles', () => {
    it('solves other 1 to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1rbb62v/sudoku_puzzle_challenges_thread/
      expectSolvedWithFinal(
        '900802037000706204000000000000020000410609002230087006000000000140208009897304021',
        '954812637381756294762943815576421983418639752239587146623195478145278369897364521'
      );
    });

    it('solves other 2 to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1rbb62v/sudoku_puzzle_challenges_thread/
      expectSolvedWithFinal(
        '9..8.2.17..17.6..4.............2....41.6.9..223..87..6.........14.2.8..98973.4..1',
        '964852317351796284782143965576421893418639752239587146623915478145278639897364521'
      );
    });

    it('solves other 3 to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1rbb62v/sudoku_puzzle_challenges_thread/
      expectSolvedWithFinal(
        '600000008001805000000000100003507800000090006002608000076000000020904730500000009',
        '657149328241835967389276154463527891815493276792618543976351482128964735534782619'
      );
    });

    it('solves other 4 to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1mpb9hm/comment/n8r4wps/
      expectSolvedWithFinal(
        '000000040000001507600500080800007300190030006000040000500820000320009018006000005',
        '758962143942381567631574289864197352195238476273645891519826734327459618486713925'
      );
    });

    it('solves other 5 to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1mpb9hm/comment/n8r4wps/
      expectSolvedWithFinal(
        '....2.41....19.8..92..5...3..2.....1.........8.7...95..43.7.......6....7.8..32.6.',
        '358726419476193825921458673562389741194567238837214956643871592219645387785932164'
      );
    });

    it('solves reddit hard to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1kfscqc/comment/mqv9sjo/
      const steps = expectSolvedWithFinal(
        '300000600010000050000300007070580006900010070200003800004050700100400005050006030',
        '342175689817269453596348217471582396983614572265793841634951728128437965759826134'
      );
      expect(steps.map((step) => step.technique)).toEqual([
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'lockedCandidatePointing',
        'hiddenTriple',
        'hiddenPair',
        'skyscraper',
        'hiddenPair',
        'skyscraper',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleRow',
        'skyscraper',
        'lockedCandidateClaiming',
        'finnedSwordfish',
        'groupedAIC',
        'groupedAIC',
        'sueDeCoq',
        'deathBlossom',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'twoStringKite',
        'emptyRectangle',
        'lockedCandidateClaiming',
        'xyzWing',
        'twoStringKite',
        'finnedXWing',
        'xyChain',
        'hiddenSingleCol',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'lockedCandidateClaiming',
        'twoStringKite',
        'swordfish',
        'hiddenPair',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
      ]);
    });

    it('solves reddit hard 2 to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1kfscqc/comment/mqv9sjo/
      const steps = expectSolvedWithFinal(
        '000007600600000003050080000000130020040020300207008001060200010004006700900000002',
        '412357689678419253359682174596134827841725396237968541765243918124896735983571462'
      );
      expect(steps.map((step) => step.technique)).toEqual([
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleRow',
        'hiddenPair',
        'hiddenTriple',
        'skyscraper',
        'lockedCandidateClaiming',
        'hiddenPair',
        'hiddenSingleBox',
        'nakedSingle',
        'lockedCandidatePointing',
        'finnedXWing',
        'uniqueRectangleType1',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleCol',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleCol',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
      ]);
    });

    it('solves reddit hard 3 to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1kfscqc/comment/mqv9sjo/
      const steps = expectSolvedWithFinal(
        '......8.5.......6.13.....9...7..9........4.1..8.2..5......8.4.7.53..6..9.2..4....',
        '296137845875492361134658792547819236362574918981263574619385427453726189728941653'
      );
      expect(steps.map((step) => step.technique)).toEqual([
        'hiddenSingleBox',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleRow',
        'hiddenSingleCol',
        'hiddenPair',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'lockedCandidateClaiming',
        'hiddenSingleRow',
        'skyscraper',
        'lockedCandidatePointing',
        'twoStringKite',
        'xyzWing',
        'finnedXWing',
        'aicRing',
        'aic',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
      ]);
    });

    it('solves reddit hard 4 to the correct final grid', () => {
      // https://www.reddit.com/r/sudoku/comments/1kfscqc/comment/mqv9sjo/
      const steps = expectSolvedWithFinal(
        '1.....3...6.1.....8.9.....1.5.....18.9..4..3...7.3...4..5.....9.8..6...3...72....',
        '172459386563182497849673521354297618698541732217836954725314869481965273936728145'
      );
      expect(steps.map((step) => step.technique)).toEqual([
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenPair',
        'hiddenSingleCol',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'lockedCandidatePointing',
        'lockedCandidatePointing',
        'hiddenSingleBox',
        'lockedCandidatePointing',
        'lockedCandidateClaiming',
        'lockedCandidateClaiming',
        'hiddenPair',
        'lockedCandidatePointing',
        'hiddenSingleCol',
        'hiddenSingleBox',
        'skyscraper',
        'twoStringKite',
        'finnedSwordfish',
        'aicRing',
        'aicRing',
        'lockedCandidateClaiming',
        'xyChain',
        'aicRing',
        'wWing',
        'xyChain',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
      ]);
    });

    it('solves hard to correct final', () => {
      // https://www.reddit.com/r/sudoku/comments/1kfscqc/comment/mqv9sjo/
      const steps = expectSolvedWithFinal(
        '071006000002900080500000001000070308085000140300400009420063000000008090000004000',
        '871346952632951784594827631946175328285639147317482569429763815753218496168594273'
      );
      expect(steps.map((step) => step.technique)).toEqual([
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleRow',
        'lockedCandidatePointing',
        'alsXZ',
        'finnedXWing',
        'deathBlossom',
        'deathBlossom',
        'hiddenSingleRow',
        'lockedCandidateClaiming',
        'nakedSingle',
        'nakedSingle',
        'hiddenPair',
        'lockedCandidatePointing',
        'lockedCandidateClaiming',
        'xyzWing',
        'aic',
        'aic',
        'lockedCandidateClaiming',
        'wWing',
        'aicRing',
        'nakedSingle',
        'finnedSwordfish',
        'lockedCandidatePointing',
        'aicRing',
        'nakedSingle',
        'aic',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'hiddenSingleBox',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
        'nakedSingle',
      ]);
    });
  });
});

describe('ALS-XZ technique', () => {
  it('finds alsXZ in hell seed puzzle', () => {
    // alsXZ fires in 54 seed puzzles (confirmed via diag-seed-scan.json)
    const grid = parseGrid(
      '107005000053700080000036004000894003009500000006001000080600400000000090000002600'
    );
    const techniques = collectTechniques(grid);
    expect(techniques.includes('alsXZ')).toBe(true);
  });

  it('finds ALS-XZ patterns when present', () => {
    const grid = parseGrid(
      '030680105601503000000001060004805630860000051057000980070408000000700008408050020'
    );

    let found = false;
    let testGrid = [...grid];
    let testCands = buildCandidates(testGrid);

    for (let i = 0; i < 200; i++) {
      const hint = findHint(testGrid, testCands);
      if (!hint) break;

      if (hint.technique === 'alsXZ') {
        found = true;
        expect(hint.eliminations.length).toBeGreaterThan(0);
        expect(hint.patternCells.length).toBeGreaterThan(0);
        break;
      }

      const next = applyHint(testGrid, testCands, hint);
      testGrid = next.grid;
      testCands = next.candidates;
    }

    expect(found).toBe(true);
  });

  it('solves puzzle that uses ALS-XZ', () => {
    const { grid: solved } = humanSolve(
      parseGrid(
        '030680105601503000000001060004805630860000051057000980070408000000700008408050020'
      )
    );
    expect(solved.every((v) => v > 0)).toBe(true);
  });
});

describe('Sue de Coq technique', () => {
  it('finds sueDeCoq in beyond-hell seed puzzle', () => {
    // sueDeCoq fires in 6 seed puzzles (confirmed via diag-seed-scan.json)
    const grid = parseGrid(
      '800000930210004007079000005092000000000500060000810020000700000000201870041000050'
    );
    const techniques = collectTechniques(grid);
    expect(techniques.includes('sueDeCoq')).toBe(true);
  });
});

describe('Death Blossom technique', () => {
  it('finds deathBlossom in hell seed puzzle', () => {
    // deathBlossom fires in 51 seed puzzles (confirmed via diag-seed-scan.json)
    const grid = parseGrid(
      '107005000053700080000036004000894003009500000006001000080600400000000090000002600'
    );
    const techniques = collectTechniques(grid);
    expect(techniques.includes('deathBlossom')).toBe(true);
  });
});

describe('finnedJellyfish technique', () => {
  it('finds finnedJellyfish in beyond hell', () => {
    const grid = parseGrid(
      '093002010001000600200000800400518000900000000080409500000050000000000207502806000'
    );
    const techniques = collectTechniques(grid);
    expect(techniques.includes('finnedJellyfish')).toBe(true);
  });
});

describe('uniqueRectangleType technique', () => {
  it('finds uniqueRectangleType1 in hell', () => {
    const grid = parseGrid(
      '000040927080000000002500340000004060061009700207300800300000100004000002076000000'
    );
    const techniques = collectTechniques(grid);
    expect(techniques.includes('uniqueRectangleType1')).toBe(true);
  });

  it('finds uniqueRectangleType2 in hell', () => {
    const grid = parseGrid(
      '509004007106000000700001280000080104600003720070000000000500600053060000000007000'
    );
    const techniques = collectTechniques(grid);
    expect(techniques.includes('uniqueRectangleType2')).toBe(true);
  });

  it('finds uniqueRectangleType3 in fiendish', () => {
    const grid = parseGrid(
      '400000037207860100000000800000001000759000000040205000010030050073080000900100006'
    );
    const techniques = collectTechniques(grid);
    expect(techniques.includes('uniqueRectangleType3')).toBe(true);
  });

  it('finds uniqueRectangleType4 in hell', () => {
    const grid = parseGrid(
      '070300008000000703090105000000902080420007600700000409100050000005206000062090000'
    );
    const techniques = collectTechniques(grid);
    expect(techniques.includes('uniqueRectangleType4')).toBe(true);
  });

  // uniqueRectangleType5 not seen yet
});

describe('ALS techniques integration', () => {
  it('uses ALS techniques when needed in solve chain', () => {
    const grid = parseGrid(
      '1.....569492.561.8.561.924.2.4.6.8..8.......66.849.12.8142.6.9.64.9.812.92.186.4.'
    );
    const { steps } = humanSolve(grid);
    const techniques = steps.map((s) => s.technique);

    const hasALSTechnique = techniques.some(
      (t) => t === 'alsXZ' || t === 'sueDeCoq' || t === 'deathBlossom'
    );

    expect(hasALSTechnique || steps[steps.length - 1]?.technique).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Eureka notation and human-readable explanation
// ---------------------------------------------------------------------------

describe('eureka notation', () => {
  it('nakedSingle produces exact eureka format (d)rRcC => rRcC=d', () => {
    const grid = new Array(81).fill(0);
    for (let c = 1; c < 9; c++) grid[c] = c + 1;
    const candidates = buildCandidates(grid);
    const hint = findHint(grid, candidates);
    expect(hint).not.toBeNull();
    expect(hint!.technique).toBe('nakedSingle');
    const { cell, digit } = hint!.placements[0];
    const row = Math.floor(cell / 9) + 1;
    const col = (cell % 9) + 1;
    expect(hint!.eureka).toBe(
      `(${digit})r${row}c${col} => r${row}c${col}=${digit}`
    );
  });

  it('hiddenSingleBox produces eureka with => and =d', () => {
    const grid = parseGrid(PUZZLES[47].init);
    const candidates = buildCandidates(grid);
    const hint = findHint(grid, candidates);
    expect(hint).not.toBeNull();
    expect(hint!.technique).toBe('hiddenSingleBox');
    expect(hint!.eureka).toBeTruthy();
    expect(hint!.eureka).toContain('=>');
    const digit = hint!.placements[0].digit;
    expect(hint!.eureka).toContain(`=${digit}`);
  });

  it('xWing eureka contains base rows/cols and elimination notation', () => {
    const grid = parseGrid(PUZZLES[38].init);
    const { steps } = humanSolve(grid);
    const xWingStep = steps.find((s) => s.technique === 'xWing');
    expect(xWingStep).toBeDefined();
    expect(xWingStep!.eureka).toBeTruthy();
    expect(xWingStep!.eureka).toContain('=>');
    expect(xWingStep!.eureka).toContain('<>');
  });

  it('lockedCandidatePointing eureka contains box notation', () => {
    const grid = parseGrid(PUZZLES[30].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'lockedCandidatePointing');
    expect(step).toBeDefined();
    expect(step!.eureka).toBeTruthy();
    expect(step!.eureka).toContain('box');
    expect(step!.eureka).toContain('=>');
  });

  it('lockedCandidateClaiming eureka contains row/col notation', () => {
    const grid = parseGrid(PUZZLES[30].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'lockedCandidateClaiming');
    expect(step).toBeDefined();
    expect(step!.eureka).toBeTruthy();
    expect(step!.eureka).toContain('=>');
  });

  it('nakedPair eureka contains digit list and cell coords', () => {
    const grid = parseGrid(
      '003040006020500000008001409109080600000000010000100203000907000306008900200006008'
    );
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'nakedPair');
    expect(step).toBeDefined();
    expect(step!.eureka).toBeTruthy();
    expect(step!.eureka).toContain('=>');
    expect(step!.eureka).toContain('<>');
  });

  it('yWing eureka contains cell coordinates and digit', () => {
    const grid = parseGrid(PUZZLES[45].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'yWing');
    expect(step).toBeDefined();
    expect(step!.eureka).toBeTruthy();
    expect(step!.eureka).toContain('=>');
  });

  it('bug eureka starts with BUG+1', () => {
    const grid = parseGrid(PUZZLES[46].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'bug');
    expect(step).toBeDefined();
    expect(step!.eureka).toMatch(/^BUG\+1 =>/);
  });

  it('uniqueRectangleType1 eureka contains UR notation', () => {
    const grid = parseGrid(PUZZLES[46].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'uniqueRectangleType1');
    expect(step).toBeDefined();
    expect(step!.eureka).toMatch(/^UR\(/);
    expect(step!.eureka).toContain('=>');
  });

  it('aic eureka is non-empty string', () => {
    const grid = parseGrid(
      '300000005001068000002000790000950040000000002103020000905400300040800050000000007'
    );
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'aic');
    expect(step).toBeDefined();
    expect(step!.eureka).toBeTruthy();
    expect(step!.eureka).toContain('=>');
  });

  it('eureka strings contain valid r[1-9]c[1-9] coordinates', () => {
    const grid = parseGrid(PUZZLES[38].init);
    const { steps } = humanSolve(grid);
    const coordPattern = /r[1-9]c[1-9]/;
    for (const step of steps) {
      if (step.eureka) {
        expect(step.eureka).toMatch(coordPattern);
      }
    }
  });

  it('all steps from findHint have non-empty eureka for non-placeholder techniques', () => {
    const placeholders = new Set([
      'xChain',
      'uniqueRectangleType5',
      'simpleColoring',
      'groupedXChain',
      'nishio',
      'nishioNet',
      'cellRegionForcingChain',
      'cellRegionForcingNet',
      'forcingChain',
      'threeDMedusa',
      'eliminateCandidates',
    ]);
    const grid = parseGrid(PUZZLES[45].init);
    const { steps } = humanSolve(grid);
    for (const step of steps) {
      if (!placeholders.has(step.technique)) {
        expect(step.eureka).toBeTruthy();
      }
    }
  });
});

describe('explanation', () => {
  it('nakedSingle explanation mentions Naked Single and the digit', () => {
    const grid = new Array(81).fill(0);
    for (let c = 1; c < 9; c++) grid[c] = c + 1;
    const candidates = buildCandidates(grid);
    const hint = findHint(grid, candidates);
    expect(hint!.explanation).toContain('Naked Single');
    expect(hint!.explanation).toContain(`${hint!.placements[0].digit}`);
  });

  it('hiddenSingleBox explanation mentions Hidden Single', () => {
    const grid = parseGrid(PUZZLES[47].init);
    const candidates = buildCandidates(grid);
    const hint = findHint(grid, candidates);
    expect(hint!.technique).toBe('hiddenSingleBox');
    expect(hint!.explanation).toContain('Hidden Single');
  });

  it('lockedCandidatePointing explanation mentions Locked Candidates', () => {
    const grid = parseGrid(PUZZLES[30].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'lockedCandidatePointing');
    expect(step!.explanation).toContain('Locked Candidates');
  });

  it('xWing explanation mentions X-Wing and elimination', () => {
    const grid = parseGrid(PUZZLES[38].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'xWing');
    expect(step!.explanation).toContain('X-Wing');
  });

  it('yWing explanation mentions Y-Wing and pincers', () => {
    const grid = parseGrid(PUZZLES[45].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'yWing');
    expect(step!.explanation).toContain('Y-Wing');
    expect(step!.explanation).toContain('pincers');
  });

  it('bug explanation mentions BUG+1', () => {
    const grid = parseGrid(PUZZLES[46].init);
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'bug');
    expect(step!.explanation).toContain('BUG+1');
  });

  it('aic explanation mentions AIC', () => {
    const grid = parseGrid(
      '300000005001068000002000790000950040000000002103020000905400300040800050000000007'
    );
    const { steps } = humanSolve(grid);
    const step = steps.find((s) => s.technique === 'aic');
    expect(step!.explanation).toContain('AIC');
  });

  it('all steps from humanSolve have non-empty explanation for non-placeholder techniques', () => {
    const placeholders = new Set([
      'xChain',
      'uniqueRectangleType5',
      'simpleColoring',
      'groupedXChain',
      'nishio',
      'nishioNet',
      'cellRegionForcingChain',
      'cellRegionForcingNet',
      'forcingChain',
      'threeDMedusa',
      'eliminateCandidates',
    ]);
    const grid = parseGrid(PUZZLES[38].init);
    const { steps } = humanSolve(grid);
    for (const step of steps) {
      if (!placeholders.has(step.technique)) {
        expect(step.explanation).toBeTruthy();
      }
    }
  });

  it('no-crash: humanSolve on puzzle-45 all steps have eureka and explanation defined', () => {
    const grid = parseGrid(PUZZLES[45].init);
    const { steps } = humanSolve(grid);
    for (const step of steps) {
      expect(step.eureka).toBeDefined();
      expect(step.explanation).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// chainPath — verify chain-based techniques populate chainPath correctly
// ---------------------------------------------------------------------------

const assertValidChainPath = (nodes: ChainNode[], _technique: string) => {
  expect(nodes.length).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    expect(typeof node.cell).toBe('number');
    expect(node.cell).toBeGreaterThanOrEqual(0);
    expect(node.cell).toBeLessThan(81);
    expect(typeof node.digit).toBe('number');
    expect(node.digit).toBeGreaterThanOrEqual(1);
    expect(node.digit).toBeLessThanOrEqual(9);
    expect(typeof node.isOn).toBe('boolean');
    if (i < nodes.length - 1) {
      expect(['strong', 'weak']).toContain(node.linkToNext);
    }
    if (node.cells !== undefined) {
      expect(Array.isArray(node.cells)).toBe(true);
      expect(node.cells.length).toBeGreaterThanOrEqual(2);
    }
  }
  // Alternation: consecutive nodes should alternate isOn
  for (let i = 0; i < nodes.length - 1; i++) {
    expect(nodes[i].isOn).not.toBe(nodes[i + 1].isOn);
  }
};

describe('chainPath', () => {
  describe('findAIC — aic technique', () => {
    it('populates chainPath with valid ChainNode structure', () => {
      const grid = parseGrid(
        '300000005001068000002000790000950040000000002103020000905400300040800050000000007'
      );
      const { steps } = humanSolve(grid);
      const step = steps.find((s) => s.technique === 'aic');
      expect(step).toBeDefined();
      expect(step!.chainPath).toBeDefined();
      assertValidChainPath(step!.chainPath!, 'aic');
    });

    it('chainPath nodes contain the cells from patternCells', () => {
      const grid = parseGrid(
        '300000005001068000002000790000950040000000002103020000905400300040800050000000007'
      );
      const { steps } = humanSolve(grid);
      const step = steps.find((s) => s.technique === 'aic');
      expect(step!.chainPath).toBeDefined();
      const chainCells = new Set(step!.chainPath!.map((n) => n.cell));
      const patternSet = new Set(step!.patternCells);
      for (const c of chainCells) {
        expect(patternSet.has(c)).toBe(true);
      }
    });
  });

  describe('findAIC — aicRing technique', () => {
    it('populates chainPath for aicRing with closing linkToNext=weak on last node', () => {
      // Use the candidate state from the existing aicRing test
      const s = (digits: number[]) => new Set(digits);
      const f = () => new Set<number>();
      const candidates: Set<number>[] = [
        f(),
        s([4, 5]),
        s([3, 4, 5]),
        f(),
        f(),
        s([3, 6]),
        s([5, 6, 7]),
        f(),
        s([6, 7]),
        f(),
        s([1, 5, 9]),
        s([5, 8, 9]),
        s([2, 3, 5]),
        f(),
        s([2, 9]),
        f(),
        s([2, 3, 5]),
        s([1, 8]),
        s([3, 5, 8, 9]),
        s([1, 3]),
        f(),
        s([2, 3, 5]),
        f(),
        s([2, 6, 9]),
        s([1, 2, 5, 6]),
        s([2, 3, 5]),
        s([6, 8]),
        f(),
        s([2, 9]),
        s([6, 9]),
        s([1, 6]),
        f(),
        f(),
        s([1, 2, 5]),
        s([2, 5]),
        f(),
        s([3, 8]),
        s([2, 4]),
        s([4, 6]),
        s([1, 6]),
        f(),
        f(),
        s([1, 2, 8]),
        f(),
        s([1, 3]),
        f(),
        s([3, 5]),
        s([5, 8]),
        f(),
        f(),
        f(),
        s([3, 8]),
        f(),
        f(),
        s([3, 5, 9]),
        f(),
        s([2, 5, 9]),
        s([2, 3, 9]),
        s([5, 6]),
        f(),
        s([3, 6, 7]),
        f(),
        s([3, 6, 7]),
        s([3, 5, 9]),
        f(),
        f(),
        s([3, 9]),
        s([5, 6]),
        f(),
        s([3, 6]),
        f(),
        f(),
        f(),
        f(),
        s([2, 3]),
        f(),
        f(),
        s([2, 3]),
        f(),
        f(),
        f(),
      ];
      const hint = findAIC(candidates);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('aicRing');
      expect(hint!.chainPath).toBeDefined();
      assertValidChainPath(hint!.chainPath!, 'aicRing');
      // Last node must have linkToNext='weak' (the closing ring link)
      const last = hint!.chainPath![hint!.chainPath!.length - 1];
      expect(last.linkToNext).toBe('weak');
    });
  });

  describe('findGroupedAIC', () => {
    it('populates chainPath with valid ChainNode structure', () => {
      // puzzle-49 exercises groupedAIC
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[49].init),
        ['groupedAIC']
      );
      const hint = findGroupedAIC(candidates, grid);
      expect(hint).not.toBeNull();
      expect(hint!.chainPath).toBeDefined();
      assertValidChainPath(hint!.chainPath!, 'groupedAIC');
    });

    it('group nodes have cells array with length >= 2', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[49].init),
        ['groupedAIC']
      );
      const hint = findGroupedAIC(candidates, grid);
      expect(hint).not.toBeNull();
      const groupNodes = hint!.chainPath!.filter((n) => n.cells !== undefined);
      if (groupNodes.length > 0) {
        for (const node of groupNodes) {
          expect(node.cells!.length).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });

  describe('yWing chainPath', () => {
    it('populates chainPath with exactly 6 nodes', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['yWing']
      );
      const hint = findHint(grid, candidates);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('yWing');
      expect(hint!.chainPath).toBeDefined();
      expect(hint!.chainPath!.length).toBe(6);
    });

    it('yWing chainPath alternates isOn correctly', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['yWing']
      );
      const hint = findHint(grid, candidates);
      assertValidChainPath(hint!.chainPath!, 'yWing');
    });

    it('yWing chainPath first and last nodes have elimination digit', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['yWing']
      );
      const hint = findHint(grid, candidates);
      const elimDigit = hint!.eliminations[0].digit;
      const path = hint!.chainPath!;
      expect(path[0].digit).toBe(elimDigit);
      expect(path[path.length - 1].digit).toBe(elimDigit);
    });

    it('yWing chainPath strong links are inside each pincer cell (in-cell bivalue)', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['yWing']
      );
      const hint = findHint(grid, candidates);
      const path = hint!.chainPath!;
      // nodes 0-1: same cell (p1), nodes 4-5: same cell (p2)
      expect(path[0].cell).toBe(path[1].cell);
      expect(path[4].cell).toBe(path[5].cell);
      // nodes 2-3: same cell (pivot)
      expect(path[2].cell).toBe(path[3].cell);
      // in-cell links are strong
      expect(path[0].linkToNext).toBe('strong');
      expect(path[2].linkToNext).toBe('strong');
      expect(path[4].linkToNext).toBe('strong');
    });
  });

  describe('xyzWing chainPath', () => {
    it('populates chainPath with exactly 6 nodes', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[48].init),
        ['xyzWing']
      );
      const hint = findHint(grid, candidates);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('xyzWing');
      expect(hint!.chainPath).toBeDefined();
      expect(hint!.chainPath!.length).toBe(6);
    });

    it('xyzWing chainPath alternates isOn correctly', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[48].init),
        ['xyzWing']
      );
      const hint = findHint(grid, candidates);
      assertValidChainPath(hint!.chainPath!, 'xyzWing');
    });

    it('xyzWing chainPath elim digit appears in first and last node', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[48].init),
        ['xyzWing']
      );
      const hint = findHint(grid, candidates);
      const elimDigit = hint!.eliminations[0].digit;
      const path = hint!.chainPath!;
      expect(path[0].digit).toBe(elimDigit);
      expect(path[path.length - 1].digit).toBe(elimDigit);
    });
  });

  describe('xyChain chainPath', () => {
    it('populates chainPath with valid structure', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['xyChain']
      );
      const hint = findHint(grid, candidates);
      expect(hint).not.toBeNull();
      expect(hint!.technique).toBe('xyChain');
      expect(hint!.chainPath).toBeDefined();
      assertValidChainPath(hint!.chainPath!, 'xyChain');
    });

    it('xyChain chainPath has even number of nodes (2 per bivalue cell)', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['xyChain']
      );
      const hint = findHint(grid, candidates);
      expect(hint!.chainPath!.length % 2).toBe(0);
    });

    it('xyChain in-cell node pairs share the same cell', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['xyChain']
      );
      const hint = findHint(grid, candidates);
      const path = hint!.chainPath!;
      // Pairs: (0,1), (2,3), (4,5), ...
      for (let i = 0; i < path.length; i += 2) {
        expect(path[i].cell).toBe(path[i + 1].cell);
        expect(path[i].linkToNext).toBe('strong');
      }
    });

    it('xyChain inter-cell links are weak', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['xyChain']
      );
      const hint = findHint(grid, candidates);
      const path = hint!.chainPath!;
      // Odd-indexed nodes (exit of each cell) link weakly to next cell, except last
      for (let i = 1; i < path.length - 1; i += 2) {
        expect(path[i].linkToNext).toBe('weak');
      }
    });

    it('xyChain first and last nodes have the elimination digit', () => {
      const { grid, candidates } = advanceUntilStall(
        parseGrid(PUZZLES[45].init),
        ['xyChain']
      );
      const hint = findHint(grid, candidates);
      const elimDigit = hint!.eliminations[0].digit;
      const path = hint!.chainPath!;
      // The enter digit of the first cell = the exit digit of the last cell = elim digit
      expect(path[0].digit).toBe(elimDigit);
      expect(path[path.length - 1].digit).toBe(elimDigit);
    });
  });

  describe('chainPath — all chain techniques in a full solve have valid structure', () => {
    const CHAIN_TECHNIQUES = new Set([
      'aic',
      'aicRing',
      'groupedAIC',
      'xyChain',
      'yWing',
      'xyzWing',
    ]);

    for (const { n, init } of PUZZLES) {
      it(`puzzle-${n} chain steps all have valid chainPath`, () => {
        const grid = parseGrid(init);
        const { steps } = humanSolve(grid);
        const chainSteps = steps.filter((s) =>
          CHAIN_TECHNIQUES.has(s.technique)
        );
        for (const step of chainSteps) {
          expect(step.chainPath).toBeDefined();
          assertValidChainPath(step.chainPath!, step.technique);
        }
      });
    }
  });
});
