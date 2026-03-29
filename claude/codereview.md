# Branches ready for code review

Merge order: pid-data → pid-stops → pid-stops-gui → pid-stops-gui-readme, pid-stops-gui-frequency

| Branch | Task | Preview URL | Description |
|--------|------|-------------|-------------|
| `mq-claude-pid-data` | t-pid-data | n/a (no frontend) | Nightly CI: downloads PID_GTFS.zip, unpacks, uploads 1-day artifact |
| `mq-claude-pid-stops` | t-pid-stops | n/a (no frontend) | Python: GTFS → SQLite + CBOR summary; process-stops CI job |
| `mq-claude-pid-stops-gui` | t-pid-stops-gui | [preview](https://marenamat.github.io/jetlagcze/preview/mq-claude-pid-stops-gui/) | Rust/WASM Leaflet map with clustering + calendar filter; gh-pages deploy |
| `mq-claude-pid-stops-gui-readme` | t-pid-stops-gui | n/a | Add map link to README |
| `mq-claude-pid-stops-gui-frequency` | t-pid-stops-gui-frequency | [preview](https://marenamat.github.io/jetlagcze/preview/mq-claude-pid-stops-gui-frequency/) | Frequency stats per stop: interval + time-window sliders, popup stats table |
