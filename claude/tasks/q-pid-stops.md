1. What output format should the departure lists use? (JSON, CSV, SQLite, something else?)
2. Should the script process all days present in the GTFS data, or only a specific date range?
3. Should this run as a job in the same `pid-data.yml` workflow (chained after `download-gtfs`),
   or as a separate workflow that's triggered after?
4. What should the output structure look like — one file per stop, one file per day, or one big file?
