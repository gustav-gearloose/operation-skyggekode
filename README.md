# Operation Skyggekode — Monorepo

Konfigurerbart agent-tema puzzle-site til fester og arrangementer (konfirmation, nonkonfirmation, fødselsdage, osv.).

## Struktur

```
├── template.html          # Fælles HTML-template
├── build.js               # Build-script (Node.js)
├── events/
│   ├── jacob/config.json  # Jacobs nonkonfirmation
│   └── julius/config.json # Julius' konfirmation
├── MICRO:Bit_kode/        # Micro:bit kode (valgfri fysisk del)
└── skyggekode_manualer_/  # PDF-manualer til det fysiske forløb
```

## Brug

### Byg en event-side

```bash
node build.js <event-navn>
```

Eksempler:
```bash
node build.js jacob    # → dist/jacob/index.html
node build.js julius   # → dist/julius/index.html
```

### Deploy til Coolify

Output er en standalone `index.html` i `dist/<event>/`. Deploy som static site:

1. Kør `node build.js <event>`
2. Deploy `dist/<event>/` som static site på Coolify

### Opret nyt arrangement

1. Opret `events/<navn>/config.json` (kopiér fra en eksisterende)
2. Tilpas: navn, agent, puzzles, svar, final kode, victory-besked
3. Kør `node build.js <navn>`

## Config-felter

| Felt | Beskrivelse |
|------|-------------|
| `event.name` | Titel øverst på siden |
| `event.agent` | Agentens navn (jubilaren) |
| `event.stamp` | Rød stamp-tekst |
| `intro` | Terminal-linjer i toppen |
| `puzzles[]` | Array af puzzle-opgaver |
| `puzzles[].clue` | Det der vises som opgave |
| `puzzles[].answer` | Korrekt svar (1 tegn eller tal) |
| `finalCode` | Den samlede kode der skal tastes ind |
| `victory` | Vinderskærm-indhold |
| `theme` | Farver (primary, accent, background) |

## Puzzle-typer

- **hex**: ASCII hex → bogstav
- **morse**: Morsekode → bogstav
- **prime**: Primtalstest → tæl ja-svar → bogstav
- **binary**: Binær → decimal → ASCII bogstav

Du kan frit mikse, ændre rækkefølge, eller tilføje nye puzzles.
