1. What output format should the departure lists use? (JSON, CSV, SQLite, something else?)

-> No specific preference but it should be easily machine-readable for the next
tasks and for the GUI, and also effective. Check JSON, CBOR, SQLite.

2. Should the script process all days present in the GTFS data, or only a specific date range?

-> All days present.

3. Should this run as a job in the same `pid-data.yml` workflow (chained after `download-gtfs`),
   or as a separate workflow that's triggered after?

-> No preference, do what you feel is best.

4. What should the output structure look like — one file per stop, one file per day, or one big file?

-> Whatever is good for the next tasks.
