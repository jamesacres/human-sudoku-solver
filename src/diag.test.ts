import * as fs from 'fs';
import * as path from 'path';
import { humanSolve } from './humanSolver';
import { describe, expect, it } from 'vitest';

const parseGrid = (text: string): number[] =>
  text.split('').map((c) => (c === '0' || c === '.' ? 0 : parseInt(c)));

// ---------------------------------------------------------------------------
// Full seed scan results (diag-seed-scan.json)
//
// Scanning all 1100 seed puzzles (11 files × 100 puzzles) through the solver:
//   0 unsolved, 0 wrong solutions (all 1100 puzzles solved correctly).
//
// ALS techniques now handle all previously-unsolved puzzles:
//   alsXZ: 54 puzzles, deathBlossom: 51 puzzles, sueDeCoq: 6 puzzles
//
// Techniques never seen across all 1100 seeds:
//   crane, xChain, groupedXChain, wxyzWing, nYWing, nakedQuad,
//   uniqueRectangleType5, nishioNet, forcingChain
//   aic (fires but aicRing always fires before it in our ordering)
//
// groupedAIC: confirmed working — direct test on HoDoKu stall-state for puzzle
//   000000960... eliminates digit 1 from r5c4 (1-indexed) = cell 39 (0-indexed).
//
// To regenerate diag-seed-scan.json:
//   Run: jest --testPathPattern="diag" --testNamePattern="full seed scan"
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Full seed scan — run all 1100 seed puzzles and write diag-seed-scan.json
// Run manually with: jest --testPathPattern="diag" --testNamePattern="full seed scan"
// ---------------------------------------------------------------------------

const SEEDS_DIR =
  '/Users/jamesacres/Documents/git/bubblyclouds-api/sudoku-seeds';

function readSeeds(): { file: string; puzzle: string; solution: string }[] {
  const seeds: { file: string; puzzle: string; solution: string }[] = [];
  const files = fs.readdirSync(SEEDS_DIR).sort();
  for (const fname of files) {
    if (!fname.endsWith('.txt')) continue;
    const lines = fs
      .readFileSync(path.join(SEEDS_DIR, fname), 'utf8')
      .split('\n');
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const puzzle = trimmed.slice(0, 81);
      if (!/^[0-9]{81}$/.test(puzzle)) continue;
      const solMatch = trimmed.match(/[1-9]{81}/);
      if (!solMatch) continue;
      seeds.push({ file: fname, puzzle, solution: solMatch[0] });
    }
  }
  return seeds;
}

type ScanResult = {
  file: string;
  puzzle: string;
  solution: string;
  solved: boolean;
  correct: boolean;
  techniques: string[];
};

describe('diag — full seed scan', () => {
  it.skip('scans all 1100 seed puzzles and writes diag-seed-scan.json', () => {
    const results: ScanResult[] = [];

    const seeds = readSeeds();

    for (const { file, puzzle, solution } of seeds) {
      const grid = parseGrid(puzzle);
      const { grid: solved, steps } = humanSolve(grid);
      const techniques = [...new Set(steps.map((s) => s.technique as string))];
      const solvedBool = solved.every((v) => v > 0);
      const correct = solvedBool && solved.join('') === solution;

      results.push({
        file,
        puzzle,
        solution,
        solved: solvedBool,
        correct,
        techniques,
      });
    }

    const byTechnique = new Map<string, ScanResult[]>();
    for (const r of results) {
      for (const t of r.techniques) {
        if (!byTechnique.has(t)) byTechnique.set(t, []);
        byTechnique.get(t)!.push(r);
      }
    }

    const unsolved = results.filter((r) => !r.solved);
    const wrongSolution = results.filter((r) => r.solved && !r.correct);

    console.log(`\nTotal puzzles scanned: ${results.length}`);
    console.log(`Unsolved: ${unsolved.length}`);
    console.log(`Wrong solution: ${wrongSolution.length}`);
    console.log(`\nTechniques seen across all puzzles:`);
    for (const [t, rs] of [...byTechnique.entries()].sort()) {
      console.log(`  ${t}: ${rs.length} puzzles`);
    }

    if (unsolved.length > 0) {
      console.log(`\nUnsolved puzzles:`);
      for (const r of unsolved) {
        console.log(`  [${r.file}] ${r.puzzle}`);
        console.log(`    techniques: ${r.techniques.join(', ')}`);
      }
    }

    const outPath =
      '/Users/jamesacres/Documents/git/bubblyclouds-app/packages/sudoku/src/utils/diag-seed-scan.json';
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          summary: {
            total: results.length,
            unsolved: unsolved.length,
            wrongSolution: wrongSolution.length,
            techniquesSeen: Object.fromEntries(
              [...byTechnique.entries()].sort().map(([t, rs]) => [t, rs.length])
            ),
          },
          unsolved: unsolved.map((r) => ({
            file: r.file,
            puzzle: r.puzzle,
            techniques: r.techniques,
          })),
          wrongSolution: wrongSolution.map((r) => ({
            file: r.file,
            puzzle: r.puzzle,
            expected: r.solution,
            techniques: r.techniques,
          })),
          firstPerTechnique: Object.fromEntries(
            [...byTechnique.entries()]
              .sort()
              .map(([t, rs]) => [t, { file: rs[0].file, puzzle: rs[0].puzzle }])
          ),
        },
        null,
        2
      )
    );
    console.log(`\nFull results written to: ${outPath}`);

    expect(results.length).toBeGreaterThan(0);
  }, 600000);
});
