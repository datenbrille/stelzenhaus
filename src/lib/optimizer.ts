import type { Part, CutDetail, StockResult, OptimizationResult } from './types';

export const KERF_DEFAULT = 0.5; // cm (= 5mm)

export function optimize(
  parts: Part[],
  stockLength: number,
  kerf: number = KERF_DEFAULT
): OptimizationResult {
  // Expand parts by quantity and sort descending by length (FFD)
  const expanded: { partId: string; partName: string; length: number; profile: string }[] = [];
  for (const part of parts) {
    for (let i = 0; i < part.quantity; i++) {
      expanded.push({
        partId: part.id,
        partName: part.name,
        length: part.length,
        profile: part.profile
      });
    }
  }
  expanded.sort((a, b) => b.length - a.length);

  // Assign stable color indices per partId
  const colorMap = new Map<string, number>();
  let colorCounter = 0;
  for (const part of parts) {
    colorMap.set(part.id, colorCounter++);
  }

  const stocks: StockResult[] = [];

  for (const item of expanded) {
    let placed = false;

    for (const stock of stocks) {
      const usedLength = stock.cuts.reduce((sum, c) => sum + c.length, 0);
      const kerfs = stock.cuts.length * kerf; // N cuts already placed → N kerfs before next
      const available = stockLength - usedLength - kerfs;

      if (item.length <= available) {
        const startPos = usedLength + kerfs;
        stock.cuts.push({
          partId: item.partId,
          partName: item.partName,
          length: item.length,
          startPos,
          endPos: startPos + item.length,
          colorIndex: colorMap.get(item.partId) ?? 0
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const newStock: StockResult = {
        stockIndex: stocks.length + 1,
        stockLength,
        cuts: [
          {
            partId: item.partId,
            partName: item.partName,
            length: item.length,
            startPos: 0,
            endPos: item.length,
            colorIndex: colorMap.get(item.partId) ?? 0
          }
        ],
        waste: 0,
        wastePercent: 0
      };
      stocks.push(newStock);
    }
  }

  // Calculate waste for each stock
  for (const stock of stocks) {
    const usedLength = stock.cuts.reduce((sum, c) => sum + c.length, 0);
    const kerfs = (stock.cuts.length - 1) * kerf;
    stock.waste = stockLength - usedLength - kerfs;
    stock.wastePercent = (stock.waste / stockLength) * 100;
  }

  const totalMaterial = stocks.length * stockLength;
  const totalUsed = expanded.reduce((sum, i) => sum + i.length, 0);
  const totalKerfs = stocks.reduce((sum, s) => sum + Math.max(0, s.cuts.length - 1) * kerf, 0);
  const totalWaste = totalMaterial - totalUsed - totalKerfs;
  const totalWastePercent = (totalWaste / totalMaterial) * 100;

  const profile = parts[0]?.profile ?? '';

  return {
    profile,
    stockLength,
    stocksNeeded: stocks.length,
    stocks,
    totalWaste,
    totalWastePercent,
    totalMaterial
  };
}

export function compareStockLengths(
  parts: Part[],
  stockLengths: number[],
  kerf: number = KERF_DEFAULT
) {
  const results = stockLengths.map((len) => {
    const r = optimize(parts, len, kerf);
    return {
      stockLength: len,
      stocksNeeded: r.stocksNeeded,
      totalWastePercent: r.totalWastePercent,
      totalWaste: r.totalWaste,
      isBest: false
    };
  });

  const best = results.reduce((a, b) => (a.totalWastePercent <= b.totalWastePercent ? a : b));
  best.isBest = true;

  return results;
}
