export interface Part {
  id: string;
  name: string;
  length: number;
  quantity: number;
  profile: string;
}

export interface CutDetail {
  partId: string;
  partName: string;
  length: number;
  startPos: number;
  endPos: number;
  colorIndex: number;
}

export interface StockResult {
  stockIndex: number;
  stockLength: number;
  cuts: CutDetail[];
  waste: number;
  wastePercent: number;
}

export interface OptimizationResult {
  profile: string;
  stockLength: number;
  stocksNeeded: number;
  stocks: StockResult[];
  totalWaste: number;
  totalWastePercent: number;
  totalMaterial: number;
  unplaceable: { partName: string; length: number }[];
}

export interface ComparisonEntry {
  stockLength: number;
  stocksNeeded: number;
  totalWastePercent: number;
  totalWaste: number;
  unplaceableCount: number;
  isBest: boolean;
}
