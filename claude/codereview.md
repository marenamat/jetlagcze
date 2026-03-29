# Branches ready for code review

| Branch | Task | Description |
|--------|------|-------------|
| `mq-claude-pid-data` | t-pid-data | Nightly CI: downloads PID_GTFS.zip, unpacks, uploads 1-day artifact |
| `mq-claude-pid-stops` | t-pid-stops | Python script: GTFS → SQLite + CBOR summary; process-stops CI job |
| `mq-claude-pid-stops-gui` | t-pid-stops-gui | Rust/WASM Leaflet map with clustering + calendar filter; gh-pages deploy |

**Merge order:** pid-data → pid-stops → pid-stops-gui
(each branch adds/extends `.github/workflows/pid-data.yml`)
