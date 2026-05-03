<script lang="ts">
  import { optimize, compareStockLengths, KERF_DEFAULT } from '$lib/optimizer';
  import { buildSvg } from '$lib/visualizer';
  import type { Part, OptimizationResult, ComparisonEntry } from '$lib/types';

  let kerf = $state(KERF_DEFAULT);
  let stockLength = $state(300);
  let compareInputRaw = $state('180,240,300,360,480,600');
  let selectedProfile = $state('alle');

  let parts = $state<Part[]>([
    { id: 'p1',  profile: '9x9',    name: 'Pfosten',         length: 180, quantity: 4  },
    { id: 'p2',  profile: '4x10',   name: 'Platform',        length: 240, quantity: 7  },
    { id: 'p3',  profile: '4x6',    name: 'Haus-A',          length: 180, quantity: 4  },
    { id: 'p4',  profile: '4x6',    name: 'Haus-B',          length: 120, quantity: 11 },
    { id: 'p5',  profile: '4x6',    name: 'Haus-C',          length: 140, quantity: 2  },
    { id: 'p6',  profile: '4x6',    name: 'Haus-D',          length: 90,  quantity: 8  },
    { id: 'p7',  profile: '4x6',    name: 'Haus-E',          length: 150, quantity: 4  },
    { id: 'p8',  profile: '4x6',    name: 'Haus-F',          length: 60,  quantity: 2  },
    { id: 'p9',  profile: '4x6',    name: 'Haus-G',          length: 140, quantity: 1  },
    { id: 'p10', profile: '2.4x14', name: 'Verkleidung-A',   length: 60,  quantity: 20 },
    { id: 'p11', profile: '2.4x14', name: 'Verkleidung-B',   length: 420, quantity: 2  },
    { id: 'p12', profile: '2.4x14', name: 'Verkleidung-C',   length: 125, quantity: 10 },
    { id: 'p13', profile: '2.4x14', name: 'Verkleidung-D',   length: 180, quantity: 5  },
    { id: 'p14', profile: '2.4x14', name: 'Verkleidung-E',   length: 210, quantity: 16 },
  ]);

  let results = $state<OptimizationResult[]>([]);
  let comparisons = $state<{ profile: string; entries: ComparisonEntry[] }[]>([]);
  let nextId = $state(100);

  const profiles = $derived(['alle', ...new Set(parts.map((p) => p.profile))]);

  function getProfileGroups(): { profile: string; parts: Part[] }[] {
    const activeProfiles =
      selectedProfile === 'alle'
        ? [...new Set(parts.map((p) => p.profile))]
        : [selectedProfile];
    return activeProfiles
      .map((profile) => ({ profile, parts: parts.filter((p) => p.profile === profile) }))
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
              <th>Länge (cm)</th>
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
                <td><input type="number" bind:value={part.quantity} min="1" class="input-sm input-num" /></td>
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
        Schnittbreite (mm)
        <input type="number" bind:value={kerf} min="0" step="0.5" onchange={() => { const v = kerf; kerf = v; }} />
        <span class="hint">Sägeblatt-Kerf, Standard 5mm</span>
      </label>

      <hr />

      <h3>Einzelne Länge optimieren</h3>
      <label>
        Einkaufslänge (cm)
        <input type="number" bind:value={stockLength} min="1" />
      </label>
      <button class="btn-primary" onclick={runOptimize}>Optimiere</button>

      <hr />

      <h3>Längen vergleichen</h3>
      <label>
        Längen (kommagetrennt, cm)
        <input bind:value={compareInputRaw} placeholder="180,240,300,360,480,600" />
      </label>
      <button class="btn-secondary" onclick={runCompare}>Beste Länge finden</button>
    </section>
  </div>

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
              <tr class={entry.isBest ? 'best-row' : ''}>
                <td>{entry.stockLength} cm</td>
                <td>{entry.stocksNeeded}</td>
                <td>{fmt(entry.totalWaste)}</td>
                <td>{fmt(entry.totalWastePercent)}%</td>
                <td>{#if entry.isBest}<span class="badge-best">Beste Wahl</span>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="chart mt">
        {#each cmp.entries as entry}
          <div class="bar-row">
            <span class="bar-label">{entry.stockLength}cm</span>
            <div class="bar-track">
              <div
                class="bar-fill {entry.isBest ? 'bar-best' : ''}"
                style="width: {Math.min(entry.totalWastePercent, 100)}%"
              ></div>
            </div>
            <span class="bar-pct">{fmt(entry.totalWastePercent)}%</span>
          </div>
        {/each}
      </div>
    </section>
  {/each}

  <!-- Schnittpläne -->
  {#each results as result}
    <section class="card mt">
      <h2>Schnittplan – Profil {result.profile} | {result.stockLength}cm Stangen</h2>
      <p class="summary">
        {result.stocksNeeded} Stangen · Gesamtmaterial: {fmt(result.totalMaterial)}cm ·
        Verschnitt: {fmt(result.totalWaste)}cm ({fmt(result.totalWastePercent)}%)
      </p>

      {#each result.stocks as stock}
        <div class="stock-row">
          <div class="stock-header">
            Stange {stock.stockIndex} – {stock.stockLength}cm
            <span class="waste-tag">Verschnitt: {fmt(stock.waste)}cm ({fmt(stock.wastePercent)}%)</span>
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
</style>
