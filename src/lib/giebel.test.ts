import { describe, it, expect } from 'vitest';
import { calculateGiebelBoards } from './giebel';

describe('calculateGiebelBoards', () => {
  it('first board equals the full base width', () => {
    const boards = calculateGiebelBoards(3000, 1500, 140, 1);
    expect(boards[0].length).toBe(3000);
  });

  it('boards get shorter towards the top', () => {
    const boards = calculateGiebelBoards(3000, 1500, 140, 1);
    for (let i = 1; i < boards.length; i++) {
      expect(boards[i].length).toBeLessThan(boards[i - 1].length);
    }
  });

  it('applies quantity multiplier to every board', () => {
    const boards = calculateGiebelBoards(3000, 1500, 140, 2);
    boards.forEach((b) => expect(b.quantity).toBe(2));
  });

  it('rounds board lengths up (Math.ceil)', () => {
    // base=1000, height=3000, boardWidth=140
    // At y=140: length = ceil(1000 * (1 - 140/3000)) = ceil(953.33) = 954
    const boards = calculateGiebelBoards(1000, 3000, 140, 1);
    expect(boards[1].length).toBe(954);
  });

  it('stops before boards shorter than 50mm', () => {
    const boards = calculateGiebelBoards(3000, 1500, 140, 1);
    boards.forEach((b) => expect(b.length).toBeGreaterThanOrEqual(50));
  });

  it('number of boards matches height ÷ boardWidth (approx)', () => {
    // 1500 / 140 ≈ 10.7 → 10 full rows (last might be cut off by <50mm limit)
    const boards = calculateGiebelBoards(3000, 1500, 140, 1);
    expect(boards.length).toBeGreaterThanOrEqual(9);
    expect(boards.length).toBeLessThanOrEqual(11);
  });

  it('returns empty array for zero height', () => {
    const boards = calculateGiebelBoards(3000, 0, 140, 1);
    expect(boards).toHaveLength(0);
  });

  it('returns empty array when base is smaller than 50mm', () => {
    const boards = calculateGiebelBoards(40, 200, 50, 1);
    expect(boards).toHaveLength(0);
  });
});
