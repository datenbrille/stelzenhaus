<script lang="ts">
  import { optimize, compareStockLengths, KERF_DEFAULT } from '$lib/optimizer';
  import { buildSvg } from '$lib/visualizer';
  import type { Part, OptimizationResult, ComparisonEntry } from '$lib/types';

  let kerf = $state(KERF_DEFAULT);
  let stockLength = $state(3000);
  let compareInputRaw = $state('1800,2400,3000,3600,4800,6000');
  let selectedProfile = $state('alle');
  let globalBoardWidth = $state(140); // mm – tatsächliche Brettbreite für Verkleidung

  // Giebel-Rechner
  let giebelBase = $state(3000);
  let giebelHeight = $state(1500);
  let giebelBoardWidth = $state(140);
  let giebelCount = $state(2);
  let giebelProfile = $state('2.4x14');
  let giebelPreview = $state<{ length: number; quantity: number }[]>([]);

  let parts = $state<Part[]>([
    { id: 'p1',  profile: '9x9',    name: 'Pfosten',       length: 1800, quantity: 4  },
    { id: 'p2',  profile: '4x10',   name: 'Platform',      length: 2400, quantity: 7  },
    { id: 'p3',  profile: '4x6',    name: 'Haus-A',        length: 1800, quantity: 4  },
    { id: 'p4',  profile: '4x6',    name: 'Haus-B',        length: 1200, quantity: 11 },
    { id: 'p5',  profile: '4x6',    name: 'Haus-C',        length: 1400, quantity: 2  },
    { id: 'p6',  profile: '4x6',    name: 'Haus-D',        length: 900,  quantity: 8  },
    { id: 'p7',  profile: '4x6',    name: 'Haus-E',        length: 1500, quantity: 4  },
    { id: 'p8',  profile: '4x6',    name: 'Haus-F',        length: 600,  quantity: 2  },
    { id: 'p9',  profile: '4x6',    name: 'Haus-G',        length: 1400, quantity: 1  },
    // Verkleidung: quantity wird aus coverageWidth / globalBoardWidth berechnet
    // coverageWidth = ursprüngliche Stückzahl × 140mm (Planmaß)
    { id: 'p10', profile: '2.4x14', name: 'Verkleidung-A', length: 600,  quantity: 20, coverageWidth: 2800  },
    { id: 'p11', profile: '2.4x14', name: 'Verkleidung-C', length: 1250, quantity: 10, coverageWidth: 1400  },
    { id: 'p12', profile: '2.4x14', name: 'Verkleidung-D', length: 1800, quantity: 5,  coverageWidth: 700   },
    { id: 'p13', profile: '2.4x14', name: 'Verkleidung-E', length: 2100, quantity: 16, coverageWidth: 2240  },
  ]);

  let results = $state<OptimizationResult[]>([]);
  let comparisons = $state<{ profile: string; entries: ComparisonEntry[] }[]>([]);
  let nextId = $state(100);

  const profiles = $derived(['alle', ...new Set(parts.map((p) => p.profile))]);

  function resolvedQuantity(part: Part): number {
    if (part.coverageWidth != null) return Math.ceil(part.coverageWidth / globalBoardWidth);
    return part.quantity;
  }

  function getProfileGroups(): { profile: string; parts: Part[] }[] {
    const activeProfiles =
      selectedProfile === 'alle'
        ? [...new Set(parts.map((p) => p.profile))]
        : [selectedProfile];
    return activeProfiles
      .map((profile) => ({
        profile,
        parts: parts
          .filter((p) => p.profile === profile)
          .map((p) => ({ ...p, quantity: resolvedQuantity(p) }))
      }))
      .filter((g) => g.parts.length > 0);
  }

  function runOptimize() {
    results = getProfileGroups().map((g) => optimize(g.parts, stockLength, kerf));
    comparisons = [];
  }

  function runCompare() {
    const lengths = compareInputRaw
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    if (lengths.length === 0) return;
    comparisons = getProfileGroups().map((g) => ({
      profile: g.profile,
      entries: compareStockLengths(g.parts, lengths, kerf)
    }));
    results = [];
  }

  function addPart() {
    parts = [
      ...parts,
      { id: `u${nextId++}`, profile: '4x6', name: 'Neues Teil', length: 100, quantity: 1 }
    ];
  }

  function removePart(id: string) {
    parts = parts.filter((p) => p.id !== id);
  }

  function calculateGiebel() {
    const boards: { length: number; quantity: number }[] = [];
    let y = 0;
    while (y < giebelHeight) {
      const length = Math.ceil(giebelBase * (1 - y / giebelHeight));
      if (length < 50) break;
      boards.push({ length, quantity: giebelCount });
      y += giebelBoardWidth;
    }
    giebelPreview = boards;
  }

  function addGiebelToParts() {
    const newParts: Part[] = giebelPreview.map((b, i) => ({
      id: `g${nextId++}`,
      profile: giebelProfile,
      name: `Giebel-${i + 1}`,
      length: b.length,
      quantity: b.quantity
    }));
    parts = [...parts, ...newParts];
    giebelPreview = [];
  }

  function buildGiebelSvg(
    preview: { length: number; quantity: number }[],
    base: number,
    height: number,
    boardWidth: number
  ): string {
    const svgW = 600;
    const scale = svgW / base;
    const svgH = Math.round(height * scale);
    const bh = Math.max(boardWidth * scale, 3);

    const COLORS = [
      '#4e9af1','#f4a261','#2a9d8f','#e76f51','#8ecae6',
      '#a8dadc','#f1c40f','#9b59b6','#1abc9c','#e74c3c'
    ];

    let rects = '';
    let labels = '';

    for (let i = 0; i < preview.length; i++) {
      const board = preview[i];
      const bw = board.length * scale;
      const bx = (svgW - bw) / 2;
      const by = svgH - (i + 1) * bh;
      const color = COLORS[i % COLORS.length];

      rects += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.ceil(bh)}" fill="${color}" stroke="white" stroke-width="0.5"/>`;

      if (bh >= 14) {
        const fontSize = Math.min(11, bh * 0.65);
        labels += `<text x="${(svgW / 2).toFixed(1)}" y="${(by + bh / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize.toFixed(1)}" fill="white" font-weight="bold">${board.length}mm</text>`;
      }
    }

    const points = `${svgW / 2},0 0,${svgH} ${svgW},${svgH}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%">
  <defs>
    <clipPath id="giebel-clip">
      <polygon points="${points}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#giebel-clip)">
    ${rects}
    ${labels}
  </g>
  <polygon points="${points}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4"/>
</svg>`;
  }

  function fmt(n: number) {
    return n.toFixed(1);
  }
</script>

<main>
  <h1>Holz-Zuschnitt Optimizer</h1>
  <p class="subtitle">Optimale Einkaufslängen für das Stelzenhaus berechnen</p>

  <div class="grid">
    <!-- Stückliste -->
    <section class="card">
      <h2>Stückliste</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Profil</th>
              <th>Name</th>
              <th>Länge (mm)</th>
              <th>Menge</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each parts as part (part.id)}
              <tr>
                <td><input bind:value={part.profile} class="input-sm" /></td>
                <td><input bind:value={part.name} class="input-sm" /></td>
                <td><input type="number" bind:value={part.length} min="1" class="input-sm input-num" /></td>
                <td>
                  {#if part.coverageWidth != null}
                    <div class="qty-computed">
                      <span class="qty-value">{resolvedQuantity(part)}</span>
                      <span class="qty-hint" title="Deckungsbreite ÷ Brettbreite">{part.coverageWidth}÷{globalBoardWidth}</span>
                    </div>
                  {:else}
                    <input type="number" bind:value={part.quantity} min="1" class="input-sm input-num" />
                  {/if}
                </td>
                <td><button class="btn-del" onclick={() => removePart(part.id)}>✕</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <button class="btn-ghost" onclick={addPart}>+ Teil hinzufügen</button>
    </section>

    <!-- Einstellungen -->
    <section class="card">
      <h2>Einstellungen</h2>

      <label>
        Profil-Filter
        <select bind:value={selectedProfile}>
          {#each profiles as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </label>

      <label>
        Schnittbreite / Kerf (mm)
        <input type="number" bind:value={kerf} min="0" step="0.5" />
        <span class="hint">Sägeblatt-Kerf, Standard 5mm</span>
      </label>

      <label>
        Tatsächliche Brettbreite Verkleidung (mm)
        <input type="number" bind:value={globalBoardWidth} min="1" />
        <span class="hint">Stückzahlen der Verkleidungs-Teile werden automatisch neu berechnet</span>
      </label>

      <hr />

      <h3>Einzelne Länge optimieren</h3>
      <label>
        Einkaufslänge (mm)
        <input type="number" bind:value={stockLength} min="1" />
      </label>
      <button class="btn-primary" onclick={runOptimize}>Optimiere</button>

      <hr />

      <h3>Längen vergleichen</h3>
      <label>
        Längen (kommagetrennt, mm)
        <input bind:value={compareInputRaw} placeholder="1800,2400,3000,3600,4800,6000" />
      </label>
      <button class="btn-secondary" onclick={runCompare}>Beste Länge finden</button>
    </section>
  </div>

  <!-- Giebel-Rechner -->
  <section class="card mt">
    <h2>Giebel-Rechner</h2>
    <p class="subtitle">Berechnet die Bretter-Längen für einen Dreiecks-Giebel (horizontal verlegt)</p>
    <div class="giebel-grid">
      <label>
        Basisbreite (mm)
        <input type="number" bind:value={giebelBase} min="1" />
      </label>
      <label>
        Giebelhöhe (mm)
        <input type="number" bind:value={giebelHeight} min="1" />
      </label>
      <label>
        Brettbreite (mm)
        <input type="number" bind:value={giebelBoardWidth} min="1" />
      </label>
      <label>
        Anzahl Giebel
        <input type="number" bind:value={giebelCount} min="1" max="10" />
      </label>
      <label>
        Profil
        <input bind:value={giebelProfile} />
      </label>
    </div>
    <button class="btn-secondary" onclick={calculateGiebel}>Berechnen</button>

    {#if giebelPreview.length > 0}
      <div class="giebel-result mt">
        <div class="giebel-svg-wrap">
          {@html buildGiebelSvg(giebelPreview, giebelBase, giebelHeight, giebelBoardWidth)}
        </div>
        <p class="summary">{giebelPreview.length} verschiedene Längen · {giebelPreview.reduce((s, b) => s + b.quantity, 0)} Bretter gesamt</p>
        <div class="giebel-list">
          {#each giebelPreview as board, i}
            <div class="giebel-chip">
              <span class="giebel-idx">#{i + 1}</span>
              <span class="giebel-len">{board.length} mm</span>
              <span class="giebel-qty">×{board.quantity}</span>
            </div>
          {/each}
        </div>
        <button class="btn-primary mt-sm" onclick={addGiebelToParts}>Zur Stückliste hinzufügen</button>
      </div>
    {/if}
  </section>

  <!-- Vergleichstabellen -->
  {#each comparisons as cmp}
    <section class="card mt">
      <h2>Längenvergleich – Profil {cmp.profile}</h2>
      <div class="table-wrap">
        <table class="result-table">
          <thead>
            <tr>
              <th>Einkaufslänge</th>
              <th>Stangen</th>
              <th>Verschnitt (cm)</th>
              <th>Verschnitt (%)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each cmp.entries as entry}
              <tr class={entry.isBest ? 'best-row' : entry.unplaceableCount > 0 ? 'invalid-row' : ''}>
                <td>{entry.stockLength} mm</td>
                {#if entry.unplaceableCount > 0}
                  <td colspan="3" class="invalid-msg">
                    <span class="badge-warn">zu kurz – {entry.unplaceableCount} Teil(e) passen nicht rein</span>
                  </td>
                {:else}
                  <td>{entry.stocksNeeded}</td>
                  <td>{fmt(entry.totalWaste)} mm</td>
                  <td>{fmt(entry.totalWastePercent)}%</td>
                {/if}
                <td>
                  {#if entry.unplaceableCount === 0 && entry.isBest}
                    <span class="badge-best">Beste Wahl</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="chart mt">
        {#each cmp.entries as entry}
          <div class="bar-row">
            <span class="bar-label">{entry.stockLength}mm</span>
            {#if entry.unplaceableCount > 0}
              <div class="bar-track"><div class="bar-invalid" style="width:100%"></div></div>
              <span class="bar-pct bar-pct-invalid">–</span>
            {:else}
              <div class="bar-track">
                <div
                  class="bar-fill {entry.isBest ? 'bar-best' : ''}"
                  style="width: {Math.min(entry.totalWastePercent, 100)}%"
                ></div>
              </div>
              <span class="bar-pct">{fmt(entry.totalWastePercent)}%</span>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/each}

  <!-- Schnittpläne -->
  {#each results as result}
    <section class="card mt">
      <h2>Schnittplan – Profil {result.profile} | {result.stockLength}mm Stangen</h2>
      <p class="summary">
        {result.stocksNeeded} Stangen · Gesamtmaterial: {fmt(result.totalMaterial)}mm ·
        Verschnitt: {fmt(result.totalWaste)}mm ({fmt(result.totalWastePercent)}%)
      </p>

      {#if result.unplaceable.length > 0}
        <div class="alert-warn">
          Achtung: {result.unplaceable.length} Teil(e) passen nicht in eine {result.stockLength}mm-Stange:
          {result.unplaceable.map(u => `${u.partName} (${u.length}mm)`).join(', ')}
        </div>
      {/if}

      {#each result.stocks as stock}
        <div class="stock-row">
          <div class="stock-header">
            Stange {stock.stockIndex} – {stock.stockLength}mm
            <span class="waste-tag">Verschnitt: {fmt(stock.waste)}mm ({fmt(stock.wastePercent)}%)</span>
          </div>
          <div class="svg-wrap">
            {@html buildSvg(stock, kerf)}
          </div>
          <div class="cut-list">
            {#each stock.cuts as cut}
              <span class="cut-chip">{cut.partName} {cut.length}cm</span>
            {/each}
          </div>
        </div>
      {/each}
    </section>
  {/each}
</main>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    background: #f5f6f8;
    color: #1a1a2e;
  }

  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  h1 {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
    color: #1a1a2e;
  }

  .subtitle {
    color: #666;
    margin: 0 0 2rem;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 1rem;
    color: #1a1a2e;
  }

  h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: #333;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
  }

  @media (max-width: 700px) {
    .grid { grid-template-columns: 1fr; }
  }

  .card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }

  .mt { margin-top: 1.5rem; }

  .table-wrap {
    overflow-x: auto;
    margin-bottom: 0.75rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th {
    text-align: left;
    padding: 0.4rem 0.5rem;
    border-bottom: 2px solid #eee;
    font-weight: 600;
    color: #555;
    white-space: nowrap;
  }

  td {
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .input-sm {
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 0.25rem 0.4rem;
    font-size: 0.85rem;
    background: #fafafa;
  }

  .input-num { width: 70px; }

  .btn-del {
    background: none;
    border: none;
    color: #e74c3c;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.25rem 0.4rem;
    border-radius: 4px;
  }
  .btn-del:hover { background: #fdecea; }

  .btn-ghost {
    background: none;
    border: 1px dashed #aaa;
    border-radius: 8px;
    padding: 0.4rem 0.9rem;
    color: #555;
    cursor: pointer;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }
  .btn-ghost:hover { border-color: #4e9af1; color: #4e9af1; }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #444;
    margin-bottom: 0.75rem;
  }

  label input, label select {
    font-size: 0.9rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fafafa;
  }

  .hint {
    font-size: 0.75rem;
    font-weight: 400;
    color: #888;
  }

  hr { border: none; border-top: 1px solid #eee; margin: 1rem 0; }

  .btn-primary {
    background: #4e9af1;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.2rem;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    width: 100%;
    margin-bottom: 0.5rem;
  }
  .btn-primary:hover { background: #3b87e0; }

  .btn-secondary {
    background: #2a9d8f;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.2rem;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    width: 100%;
  }
  .btn-secondary:hover { background: #238a7c; }

  /* Result table */
  .result-table td, .result-table th {
    padding: 0.5rem 0.75rem;
  }

  .best-row td { background: #f0fdf4; color: #166534; font-weight: 600; }
  .badge-best {
    background: #16a34a;
    color: white;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  /* Chart */
  .chart { display: flex; flex-direction: column; gap: 0.5rem; }

  .bar-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
  }

  .bar-label { width: 60px; text-align: right; color: #555; }

  .bar-track {
    flex: 1;
    height: 20px;
    background: #f0f0f0;
    border-radius: 999px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: #f4a261;
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .bar-best { background: #2a9d8f; }

  .bar-pct { width: 45px; color: #444; font-variant-numeric: tabular-nums; }

  /* Stock rows */
  .stock-row {
    margin-bottom: 1.25rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #f0f0f0;
  }
  .stock-row:last-child { border-bottom: none; }

  .stock-header {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .waste-tag {
    font-size: 0.8rem;
    font-weight: 400;
    color: #888;
    background: #f5f5f5;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }

  .svg-wrap {
    border-radius: 8px;
    overflow: hidden;
    background: #f8f8f8;
    margin-bottom: 0.4rem;
  }

  .cut-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .cut-chip {
    font-size: 0.75rem;
    background: #eef2ff;
    color: #3730a3;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }

  .summary {
    color: #555;
    font-size: 0.9rem;
    margin: 0 0 1.25rem;
  }

  /* Quantity computed */
  .qty-computed {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
  }
  .qty-value {
    font-weight: 600;
    font-size: 0.9rem;
    min-width: 28px;
  }
  .qty-hint {
    font-size: 0.7rem;
    color: #aaa;
    white-space: nowrap;
  }

  /* Giebel */
  .giebel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .giebel-svg-wrap {
    background: #f8fafc;
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 1rem;
    overflow: hidden;
  }
  .giebel-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }
  .giebel-chip {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
  }
  .giebel-idx { color: #aaa; font-size: 0.7rem; }
  .giebel-len { font-weight: 600; color: #166534; }
  .giebel-qty { color: #555; }
  .mt-sm { margin-top: 0.5rem; }

  .alert-warn {
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: 8px;
    padding: 0.6rem 0.9rem;
    font-size: 0.85rem;
    color: #9a3412;
    margin-bottom: 1rem;
  }

  .badge-warn {
    background: #f97316;
    color: white;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .invalid-row td { background: #fafafa; color: #bbb; }
  .invalid-msg { vertical-align: middle; }

  .bar-invalid {
    height: 100%;
    background: repeating-linear-gradient(
      90deg,
      #e5e7eb 0px, #e5e7eb 6px,
      #f3f4f6 6px, #f3f4f6 12px
    );
    border-radius: 999px;
  }

  .bar-pct-invalid { color: #bbb; }
</style>
