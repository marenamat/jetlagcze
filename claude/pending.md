# Pending questions

## t-pid-stops (`claude/tasks/q-pid-stops.md`)

1. What output format should the departure lists use? (JSON, CSV, SQLite, something else?)
2. Should the script process all days present in the GTFS data, or only a specific date range?
3. Should this run as a job in the same `pid-data.yml` workflow, or a separate workflow?
4. What should the output structure look like — one file per stop, one file per day, or one big file?

## t-pid-stops-gui (`claude/tasks/q-pid-stops-gui.md`)

1. How should the Rust/WASM frontend fetch stop data? (static JSON on gh-pages, API, or bundled?)
2. Which mapping approach — Leaflet via JS interop, or a pure-Rust tile renderer?
3. Should gh-pages deployment be automatic on merge to main, or manual?
4. How many stops are expected — do we need marker clustering?
