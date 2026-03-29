# Trip spacing

Check `freq-short.txt` for sorted stop list. Methodology:

- take a window between 8:00 and 21:00, sort all departures
- for one-way stops, calculate two-trip time difference,
  i.e. start watch when one bus departs, wait until two more depart, stop watch
- for multiway stops, calculate four-trip time difference,
  i.e. start watch when one bus departs, wait until four more depart, stop watch

See `freq-full.txt` for all-departure list.
