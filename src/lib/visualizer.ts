import type { StockResult } from './types';

const COLORS = [
  '#4e9af1', '#f4a261', '#2a9d8f', '#e76f51', '#8ecae6',
  '#a8dadc', '#f1c40f', '#9b59b6', '#1abc9c', '#e74c3c',
  '#3498db', '#e67e22', '#27ae60', '#d35400', '#2980b9'
];

export function buildSvg(stock: StockResult, kerf: number): string {
  const svgWidth = 900;
  const barHeight = 48;
  const barY = 16;
  const labelWidth = 0;
  const barWidth = svgWidth - labelWidth - 4;

  const scale = barWidth / stock.stockLength;

  let rects = '';
  let labels = '';
  let kerfLines = '';

  for (let i = 0; i < stock.cuts.length; i++) {
    const cut = stock.cuts[i];
    const x = labelWidth + cut.startPos * scale;
    const w = cut.length * scale;
    const color = COLORS[cut.colorIndex % COLORS.length];

    rects += `<rect x="${x.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="${barHeight}" fill="${color}" stroke="white" stroke-width="0.5"/>`;

    // Label inside rect if wide enough
    const labelText = `${cut.partName} ${cut.length}mm`;
    const minWidthForLabel = 30;
    if (w > minWidthForLabel) {
      const cx = x + w / 2;
      const cy = barY + barHeight / 2;
      labels += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="white" font-weight="bold" style="text-shadow:0 1px 2px rgba(0,0,0,0.5)">${escapeXml(labelText)}</text>`;
    }

    // Kerf line after each cut except the last
    if (i < stock.cuts.length - 1) {
      const kerfX = (labelWidth + cut.endPos * scale).toFixed(1);
      const kerfW = (kerf * scale).toFixed(2);
      kerfLines += `<rect x="${kerfX}" y="${barY}" width="${Math.max(parseFloat(kerfW), 1)}" height="${barHeight}" fill="#e74c3c" opacity="0.85"/>`;
    }
  }

  // Waste at end
  const usedEnd = stock.cuts.length > 0
    ? stock.cuts[stock.cuts.length - 1].endPos + (stock.cuts.length - 1) * kerf
    : 0;

  // Recalculate proper waste start: last cut end + last kerf
  const lastCut = stock.cuts[stock.cuts.length - 1];
  const wasteStart = lastCut ? lastCut.endPos + (stock.cuts.length - 1) * kerf : 0;
  const wasteW = (stock.stockLength - wasteStart) * scale;
  const wasteX = labelWidth + wasteStart * scale;

  if (wasteW > 0.5) {
    rects += `<rect x="${wasteX.toFixed(1)}" y="${barY}" width="${wasteW.toFixed(1)}" height="${barHeight}" fill="#bdc3c7"/>`;
    // Hatch pattern
    rects += `<rect x="${wasteX.toFixed(1)}" y="${barY}" width="${wasteW.toFixed(1)}" height="${barHeight}" fill="url(#hatch)" opacity="0.5"/>`;

    if (wasteW > 25) {
      const cx = wasteX + wasteW / 2;
      labels += `<text x="${cx.toFixed(1)}" y="${(barY + barHeight / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#555">${stock.waste.toFixed(1)}cm</text>`;
    }
  }

  const svgHeight = barY + barHeight + barY;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="${svgHeight}">
  <defs>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#888" stroke-width="1.5"/>
    </pattern>
  </defs>
  ${rects}
  ${kerfLines}
  ${labels}
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
