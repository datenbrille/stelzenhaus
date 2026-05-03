# Holz-Zuschnitt Optimizer

## Projektbeschreibung
Web-App zur Optimierung von Holzzuschnitten für ein Stelzenhaus (Kinderspielhaus).
Der Benutzer gibt Stücklisten ein und die App berechnet wie er das Holz optimal aus
Standardlängen (OBI/Baumarkt) herauschneiden kann – mit Berücksichtigung der
Sägeblatt-Schnittbreite (Kerf = 5mm).

## Tech Stack
- **SvelteKit** (wie bisherige Projekte des Users)
- **TypeScript**
- **Vercel** für Hosting
- **Kein Backend** – alles im Browser/Frontend

## Was gebaut werden soll

### 1. Stückliste eingeben
Der User kann Holzteile eingeben:
- Profil (z.B. "9x9", "4x10", "4x6", "2,4x14")
- Länge in cm
- Menge (Stückzahl)

Vorbefüllte Stückliste (aus Bauplänen):
```
Pfosten 9x9cm:       4x 180cm
Platform 4x10cm:     7x 240cm
Haus 4x6cm:          4x 180cm, 11x 120cm, 2x 140cm, 8x 90cm, 4x 150cm, 2x 60cm, 1x 140cm
Verkleidung 2,4x14:  20x 60cm, 2x 420cm, 10x 125cm, 5x 180cm, 16x 210cm
```

### 2. Einkaufslängen testen
- User gibt mögliche Einkaufslängen an (z.B. 180, 240, 300, 360, 480, 600cm)
- App berechnet für jede Länge: wie viele Stangen kaufen, wie viel Verschnitt
- Zeigt welche Länge am besten ist

### 3. Schnittplan mit SVG Visualisierung
- Für jede gekaufte Stange: grafische SVG-Darstellung wie die Teile herausgeschnitten werden
- Jedes Teil in anderer Farbe
- Schnittlinien (5mm Kerf) rot markiert
- Verschnitt am Ende grau

### 4. Vergleichschart
- Balkendiagramm: Verschnittquote % für verschiedene Einkaufslängen

## Algorithmus: Bin Packing (First Fit Decreasing)
```
1. Teile nach Länge sortieren (größte zuerst)
2. Für jedes Teil: passt es in eine bereits offene Stange? (unter Berücksichtigung Kerf)
   - JA: Hinzufügen
   - NEIN: Neue Stange öffnen
3. Kerf-Formel: Für N Teile in einer Stange gibt es (N-1) Schnitte à 5mm
4. Verschnitt = Stangenlänge - Summe(Teile) - Summe(Kerfs)
```

Beispiel:
```
Stange: 300cm
Teil A: 180cm
[5mm Schnitt]
Teil B: 90cm
[5mm Schnitt]
→ Verwendet: 180 + 0.5 + 90 + 0.5 = 271cm
→ Verschnitt: 29cm = 9.7%
```

## Projektstruktur
```
holz-zuschnitt-optimizer/
├── src/
│   ├── lib/
│   │   ├── optimizer.ts      # Bin-Packing Algorithmus + Kerf-Logik
│   │   ├── visualizer.ts     # SVG Rendering der Schnittdiagramme
│   │   └── types.ts          # TypeScript Interfaces
│   ├── routes/
│   │   ├── +page.svelte      # Haupt-UI
│   │   └── +layout.svelte    # Layout
│   └── app.css
├── CLAUDE.md
├── svelte.config.js
├── tsconfig.json
└── package.json
```

## TypeScript Interfaces
```typescript
interface Part {
  id: string;
  name: string;
  length: number;      // in cm
  quantity: number;
  profile: string;     // z.B. "9x9", "4x6"
}

interface CutDetail {
  partId: string;
  partName: string;
  length: number;      // in cm
  startPos: number;    // in cm (inkl. Kerf)
  endPos: number;      // in cm
}

interface StockResult {
  stockLength: number;
  cuts: CutDetail[];
  waste: number;       // in cm
  wastePercent: number;
}

interface OptimizationResult {
  profile: string;
  stockLength: number;
  stocksNeeded: number;
  stocks: StockResult[];
  totalWaste: number;
  totalWastePercent: number;
}
```

## SVG Visualisierung Details
- Breite: 100% (responsiv)
- Höhe: 80px pro Stange
- Jedes Teil: farbiges Rechteck mit Label (Name + Länge)
- Schnittlinie: rote gestrichelte Linie mit "5mm" Label
- Verschnitt: graues schraffiertes Rechteck
- Stock-Label links: "Stange 1 – 300cm (Verschnitt: 9.7%)"

## UX Details
- Profil-Filter Dropdown (alle Profile oder einzeln)
- Einkaufslänge Input (number, in cm)
- Schnittbreite Input (number, default 5mm – änderbar)
- Button: "Optimiere" → zeigt Schnittplan für diese Länge
- Button: "Beste Länge finden" → vergleicht alle möglichen Längen
- Tabelle: Vergleich aller Längen (Stangen, Verschnitt%, Kosten optional)

## Setup Befehle
```bash
npm create svelte@latest holz-zuschnitt-optimizer
cd holz-zuschnitt-optimizer
npm install
npm run dev
```

## Deployment
```bash
# Vercel (wie bisherige Projekte)
vercel deploy
# oder via GitHub + Vercel Auto-Deploy
```

## Hinweise für Claude Code
- Kein Backend, kein API-Call – alles im Browser
- Algorithmus muss Kerf korrekt rechnen: (Anzahl Teile - 1) * 5mm pro Stange
- SVG soll responsiv sein (viewBox verwenden)
- Stückliste ist vorbefüllt aber editierbar (Teile hinzufügen/löschen)
- Vergleich soll automatisch die beste Einkaufslänge markieren (grün)
