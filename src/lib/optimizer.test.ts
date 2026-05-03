import { describe, it, expect } from 'vitest';
import { optimize, compareStockLengths, KERF_DEFAULT } from './optimizer';

const KERF = KERF_DEFAULT; // 5mm

// Helper: build a minimal Part
function part(id: string, length: number, quantity: number, profile = 'test') {
  return { id, name: id, length, quantity, profile };
}

// ---------------------------------------------------------------------------
// optimize()
// ---------------------------------------------------------------------------

describe('optimize – basic placement', () => {
  it('fits one part into one stock', () => {
    const result = optimize([part('a', 500, 1)], 1000, KERF);
    expect(result.stocksNeeded).toBe(1);
    expect(result.stocks[0].cuts).toHaveLength(1);
    expect(result.stocks[0].waste).toBe(500);
  });

  it('two parts that fit in one stock with kerf', () => {
    // 500 + 5 (kerf) + 495 = 1000 → zero waste
    const result = optimize([part('a', 500, 1), part('b', 495, 1)], 1000, KERF);
    expect(result.stocksNeeded).toBe(1);
    expect(result.totalWaste).toBe(0);
  });

  it('opens a second stock when first is full', () => {
    // 600 + 5 + 600 = 1205 > 1000 → needs 2 stocks
    const result = optimize([part('a', 600, 2)], 1000, KERF);
    expect(result.stocksNeeded).toBe(2);
  });
});

describe('optimize – kerf calculation', () => {
  it('applies (N-1) kerfs for N parts in one stock', () => {
    // 3 parts of 300mm in a 1000mm stock
    // used: 300+300+300 = 900, kerfs: 2×5 = 10, waste: 90
    const result = optimize([part('a', 300, 3)], 1000, KERF);
    expect(result.stocksNeeded).toBe(1);
    expect(result.stocks[0].waste).toBe(90);
  });

  it('no kerf for a single part in a stock', () => {
    const result = optimize([part('a', 700, 1)], 1000, KERF);
    expect(result.stocks[0].waste).toBe(300);
  });

  it('respects custom kerf value', () => {
    // 2 parts 490mm each, kerf 10mm: 490+10+490 = 990 → waste 10
    const result = optimize([part('a', 490, 2)], 1000, 10);
    expect(result.stocksNeeded).toBe(1);
    expect(result.stocks[0].waste).toBe(10);
  });
});

describe('optimize – FFD ordering', () => {
  it('places larger parts first regardless of input order', () => {
    // If sorted: 700 goes first, then 290 fits (700+5+290=995 ≤ 1000)
    // Without FFD: 290 first, 700 doesn't fit → 2 stocks
    const result = optimize([part('small', 290, 1), part('big', 700, 1)], 1000, KERF);
    expect(result.stocksNeeded).toBe(1);
  });
});

describe('optimize – waste percentages', () => {
  it('calculates waste percent correctly', () => {
    // 500mm part in 1000mm stock → 50% waste
    const result = optimize([part('a', 500, 1)], 1000, KERF);
    expect(result.stocks[0].wastePercent).toBeCloseTo(50, 5);
  });

  it('zero waste when parts fill stock perfectly', () => {
    const result = optimize([part('a', 500, 1), part('b', 495, 1)], 1000, KERF);
    expect(result.totalWastePercent).toBeCloseTo(0, 5);
  });

  it('totalWastePercent aggregates across multiple stocks', () => {
    // 2 stocks of 1000mm each = 2000mm total
    // 2 parts of 600mm → each in own stock, waste: 400+400=800 → 40%
    const result = optimize([part('a', 600, 2)], 1000, KERF);
    expect(result.totalMaterial).toBe(2000);
    expect(result.totalWaste).toBe(800);
    expect(result.totalWastePercent).toBeCloseTo(40, 5);
  });
});

describe('optimize – unplaceable parts', () => {
  it('flags parts longer than the stock', () => {
    const result = optimize([part('a', 1200, 1)], 1000, KERF);
    expect(result.unplaceable).toHaveLength(1);
    expect(result.unplaceable[0].partName).toBe('a');
    expect(result.stocksNeeded).toBe(0);
  });

  it('places smaller parts even when some are unplaceable', () => {
    const result = optimize([part('big', 1200, 1), part('small', 400, 1)], 1000, KERF);
    expect(result.unplaceable).toHaveLength(1);
    expect(result.stocksNeeded).toBe(1);
    expect(result.stocks[0].cuts[0].partName).toBe('small');
  });

  it('part exactly equal to stock length fits', () => {
    const result = optimize([part('a', 1000, 1)], 1000, KERF);
    expect(result.unplaceable).toHaveLength(0);
    expect(result.stocksNeeded).toBe(1);
    expect(result.stocks[0].waste).toBe(0);
  });
});

describe('optimize – cut positions', () => {
  it('startPos of first cut is 0', () => {
    const result = optimize([part('a', 300, 1)], 1000, KERF);
    expect(result.stocks[0].cuts[0].startPos).toBe(0);
  });

  it('startPos of second cut accounts for first cut + kerf', () => {
    // first: 0–300, kerf 5mm, second starts at 305
    const result = optimize([part('a', 300, 1), part('b', 200, 1)], 1000, KERF);
    const cuts = result.stocks[0].cuts;
    expect(cuts[1].startPos).toBe(305);
  });
});

// ---------------------------------------------------------------------------
// compareStockLengths()
// ---------------------------------------------------------------------------

describe('compareStockLengths', () => {
  const parts = [part('a', 500, 2)]; // 2× 500mm

  it('marks the length with lowest waste as best', () => {
    // 1000mm: 500+5+500=1005 > 1000 → 2 stocks, each 500mm waste = 1000mm waste
    // 1100mm: fits in 1 stock: 500+5+500=1005, waste=95 → 8.6%
    const results = compareStockLengths(parts, [1000, 1100], KERF);
    const best = results.find((r) => r.isBest);
    expect(best?.stockLength).toBe(1100);
  });

  it('does not mark invalid lengths as best', () => {
    // 400mm is too short for 500mm parts
    const results = compareStockLengths(parts, [400, 1100], KERF);
    const invalidEntry = results.find((r) => r.stockLength === 400);
    expect(invalidEntry?.unplaceableCount).toBeGreaterThan(0);
    expect(invalidEntry?.isBest).toBe(false);
    const best = results.find((r) => r.isBest);
    expect(best?.stockLength).toBe(1100);
  });

  it('returns one entry per stock length', () => {
    const results = compareStockLengths(parts, [600, 800, 1000, 1200], KERF);
    expect(results).toHaveLength(4);
  });

  it('all lengths invalid → no best marked', () => {
    const results = compareStockLengths(parts, [100, 200], KERF);
    expect(results.every((r) => !r.isBest)).toBe(true);
  });
});
