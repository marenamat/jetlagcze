Update the CI workflows so that whenever the processing scripts change
(src/process_gtfs.py, src/process_gtfs_times.py, requirements.txt),
the full data pipeline is automatically triggered:

- Download PID_GTFS.zip
- Run the relevant processing scripts
- Deploy the resulting CBOR files

This ensures the deployed data always reflects the current processing
logic, not just the nightly schedule.
