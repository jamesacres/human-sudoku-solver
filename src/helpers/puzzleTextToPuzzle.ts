import type { Notes } from '../types/Notes';
import type { Puzzle } from '../types/Puzzle';
import type { PuzzleRowOrColumn } from '../types/PuzzleRowOrColumn';

export const puzzleTextToPuzzle = (puzzleText: string): Puzzle<number> => {
  const puzzle: Puzzle<number> = [
    [
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    ],
    [
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    ],
    [
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    ],
  ];
  const lines = [
    puzzleText.slice(0, 9),
    puzzleText.slice(9, 18),
    puzzleText.slice(18, 27),
    puzzleText.slice(27, 36),
    puzzleText.slice(36, 45),
    puzzleText.slice(45, 54),
    puzzleText.slice(54, 63),
    puzzleText.slice(63, 72),
    puzzleText.slice(72, 81),
  ];
  for (const [row, line] of Object.entries(lines)) {
    const boxes = [line.slice(0, 3), line.slice(3, 6), line.slice(6, 9)];
    for (const [box, columns] of Object.entries(boxes)) {
      const values = columns.split('');
      for (const [column, value] of Object.entries(values)) {
        const boxX = Number(box) as PuzzleRowOrColumn;
        const boxY = Math.floor(Number(row) / 3) as PuzzleRowOrColumn;
        const cellX = Number(column) as PuzzleRowOrColumn;
        const cellY = (Number(row) % 3) as PuzzleRowOrColumn;
        puzzle[boxX][boxY][cellX][cellY] = Number(value.replace('.', '0'));
      }
    }
  }
  return puzzle;
};

export const puzzleToPuzzleText = (puzzle: Puzzle<number | Notes>): string => {
  let puzzleText = '';
  Array.from(Array(3)).map((_, a) => {
    Array.from(Array(3)).map((_, b) => {
      Array.from(Array(3)).map((_, c) => {
        Array.from(Array(3)).map((_, d) => {
          const number =
            puzzle[c as PuzzleRowOrColumn][a as PuzzleRowOrColumn][
              d as PuzzleRowOrColumn
            ][b as PuzzleRowOrColumn];
          puzzleText = `${puzzleText}${(typeof number === 'number' && number) || '.'}`;
        });
      });
    });
  });
  return puzzleText;
};
