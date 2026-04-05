import { describe, expect, it } from 'vitest';
import { puzzleTextToPuzzle, puzzleToPuzzleText } from './puzzleTextToPuzzle';

describe('puzzleTextToPuzzle', () => {
  it('should convert a 81-character puzzle string to puzzle structure', () => {
    // Classic sudoku puzzle string (81 chars)
    const puzzleText =
      '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
    const puzzle = puzzleTextToPuzzle(puzzleText);

    // Verify the puzzle was parsed correctly
    expect(puzzle[0][0][0][0]).toBe(5);
    expect(puzzle[0][0][1][0]).toBe(3);
  });

  it('should handle dots as empty cells', () => {
    const puzzleText =
      '53..7....6..195....9....6..8...6...34..8.3..17...2...6.6....28....419..5....8.79';
    const puzzle = puzzleTextToPuzzle(puzzleText);

    // Dots should be converted to 0
    expect(puzzle[0][0][2][0]).toBe(0);
  });

  it('should create correct 3D structure with boxes and cells', () => {
    const puzzleText =
      '123456789' +
      '456789123' +
      '789123456' +
      '234567891' +
      '567891234' +
      '891234567' +
      '345678912' +
      '678912345' +
      '912345678';
    const puzzle = puzzleTextToPuzzle(puzzleText);

    // Check structure exists
    expect(puzzle).toHaveProperty('0');
    expect(puzzle).toHaveProperty('1');
    expect(puzzle).toHaveProperty('2');

    // Check nested structure
    expect(puzzle[0][0]).toHaveProperty('0');
    expect(puzzle[0][0][0]).toHaveLength(3);
  });

  it('should parse first row correctly', () => {
    const puzzleText = '123456789' + '.'.repeat(72);
    const puzzle = puzzleTextToPuzzle(puzzleText);

    // First row should be in first box row (boxY = 0)
    expect(puzzle[0][0][0][0]).toBe(1);
    expect(puzzle[0][0][1][0]).toBe(2);
    expect(puzzle[0][0][2][0]).toBe(3);
  });

  it('should parse all 9 rows correctly', () => {
    const puzzleText =
      '111111111222222222333333333444444444555555555666666666777777777888888888999999999';
    const puzzle = puzzleTextToPuzzle(puzzleText);

    // Check that all values are placed correctly
    for (let row = 0; row < 9; row++) {
      const expectedValue = row + 1; // Each row has its row number + 1 (1-9)
      const boxY = Math.floor(row / 3);
      const cellY = row % 3;

      // Check first cell of each row
      // @ts-expect-error - Puzzle type doesn't have numeric index signature
      expect(puzzle[0][boxY][0][cellY]).toBe(expectedValue);
    }
  });

  it('should handle all 9 boxes', () => {
    // Create puzzle with different values in each box
    let puzzleText = '';
    for (let i = 1; i <= 9; i++) {
      puzzleText += String(i).repeat(9);
    }

    const puzzle = puzzleTextToPuzzle(puzzleText);

    // Verify each box (vertical, boxY) has correct value from its first row
    for (let box = 0; box < 3; box++) {
      const row = box; // Each box starts at a different row
      const expectedValue = row + 1; // Row 0 has 1s, row 1 has 2s, row 2 has 3s, etc.
      const boxY = Math.floor(row / 3);
      const cellY = row % 3;
      // @ts-expect-error - Puzzle type doesn't have numeric index signature
      expect(puzzle[0][boxY][0][cellY]).toBe(expectedValue);
    }
  });

  it('should handle empty puzzle', () => {
    const puzzleText = '.'.repeat(81);
    const puzzle = puzzleTextToPuzzle(puzzleText);

    // All cells should be 0
    for (let bx = 0; bx < 3; bx++) {
      for (let by = 0; by < 3; by++) {
        for (let cx = 0; cx < 3; cx++) {
          for (let cy = 0; cy < 3; cy++) {
            // @ts-expect-error - Puzzle type doesn't have numeric index signature
            expect(puzzle[bx][by][cx][cy]).toBe(0);
          }
        }
      }
    }
  });

  it('should handle full puzzle with no empty cells', () => {
    const fullPuzzle =
      '517936428638142957429758316186523749953871682742689531375214869891365274264497135';
    const puzzle = puzzleTextToPuzzle(fullPuzzle);

    // No cell should be 0
    for (let bx = 0; bx < 3; bx++) {
      for (let by = 0; by < 3; by++) {
        for (let cx = 0; cx < 3; cx++) {
          for (let cy = 0; cy < 3; cy++) {
            // @ts-expect-error - Puzzle type doesn't have numeric index signature
            expect(puzzle[bx][by][cx][cy]).toBeGreaterThan(0);
            // @ts-expect-error - Puzzle type doesn't have numeric index signature
            expect(puzzle[bx][by][cx][cy]).toBeLessThanOrEqual(9);
          }
        }
      }
    }
  });

  it('should handle mixed dots and numbers', () => {
    const puzzleText =
      '5.3..7....6..195....9....6..8...6...34..8.3..17...2...6.6....28....419..5....8.79';
    const puzzle = puzzleTextToPuzzle(puzzleText);

    // Check specific values
    expect(puzzle[0][0][0][0]).toBe(5);
    expect(puzzle[0][0][2][0]).toBe(3);
    expect(puzzle[0][0][0][1]).toBe(0); // Dot
  });
});

describe('puzzleToPuzzleText', () => {
  it('should convert puzzle back to text format', () => {
    const originalText =
      '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
    const puzzle = puzzleTextToPuzzle(originalText);
    const convertedText = puzzleToPuzzleText(puzzle);

    // Should be able to parse again
    const reparsedPuzzle = puzzleTextToPuzzle(convertedText);
    expect(reparsedPuzzle).toEqual(puzzle);
  });

  it('should use dot for empty cells', () => {
    const puzzleText = '.123456789' + ''.padEnd(72, '.');
    const puzzle = puzzleTextToPuzzle(puzzleText);
    const resultText = puzzleToPuzzleText(puzzle);

    expect(resultText[0]).toBe('.');
    expect(resultText[1]).toBe('1');
  });

  it('should preserve all numbers', () => {
    const fullPuzzle =
      '517936428638142957429758316186523749953871682742689531375214869891365274264497135';
    const puzzle = puzzleTextToPuzzle(fullPuzzle);
    const resultText = puzzleToPuzzleText(puzzle);

    expect(resultText).toBe(fullPuzzle);
  });

  it('should handle empty puzzle', () => {
    const puzzleText = '.'.repeat(81);
    const puzzle = puzzleTextToPuzzle(puzzleText);
    const resultText = puzzleToPuzzleText(puzzle);

    expect(resultText).toBe(puzzleText);
  });

  it('should return 81-character string', () => {
    const puzzleText =
      '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
    const puzzle = puzzleTextToPuzzle(puzzleText);
    const resultText = puzzleToPuzzleText(puzzle);

    expect(resultText).toHaveLength(81);
  });
});

describe('roundtrip conversion', () => {
  it('should preserve puzzle through multiple conversions', () => {
    const originalText =
      '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

    const puzzle1 = puzzleTextToPuzzle(originalText);
    const text1 = puzzleToPuzzleText(puzzle1);
    const puzzle2 = puzzleTextToPuzzle(text1);
    const text2 = puzzleToPuzzleText(puzzle2);

    expect(text1).toBe(text2);
    expect(puzzle1).toEqual(puzzle2);
  });

  it('should handle mixed content correctly', () => {
    const puzzleText =
      '1.3..5.7.8.1.6...6.3....5.4.6.7..9..9.1..2..2.8..6.7.7....3.5...8.1.3.7.1..3.6.';
    const puzzle = puzzleTextToPuzzle(puzzleText);
    const resultText = puzzleToPuzzleText(puzzle);
    const reparsedPuzzle = puzzleTextToPuzzle(resultText);

    expect(puzzle).toEqual(reparsedPuzzle);
  });
});
