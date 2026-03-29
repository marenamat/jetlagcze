PID stops are in different fare zones: P, 0, B, 1, 2, 3, etc.

Add zone information to the stop data and a multi-choice filter in the
GUI to select which zones to display.

Steps:
- Extract zone_id from stops.txt in process_gtfs.py, include it in
  pid_stops.cbor alongside each stop
- In the Rust frontend, add zone field to Stop/StopOut
- In filter_stops (or a new function), accept a list of zones to include
- In the UI, add a multi-choice zone selector (default: P, 0, B)
