#!/usr/bin/env python3
"""
Process PID GTFS data into a SQLite database and a compact CBOR summary.

Usage: process_gtfs.py <gtfs_dir> <output_dir>

Outputs:
  <output_dir>/pid_stops.sqlite  -- full data (stops, trips, stop_times,
                                    service_dates, stop_active_days)
  <output_dir>/pid_stops.cbor    -- compact summary for the GUI:
                                    [{id, name, lat, lon, pseudo, dates: [YYYY-MM-DD, ...]}]

Notes:
  - Stops with empty/zero lat/lon inherit coordinates from their parent_station.
  - Stops still lacking valid coordinates after parent lookup are skipped.
  - Stops whose stop_id starts with 'T' are marked pseudo=True (routing nodes,
    not actual boarding locations).
"""

import cbor2
import csv
import sqlite3
import sys
from datetime import date, timedelta, datetime
from pathlib import Path

WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
BATCH = 10_000


def parse_date(s: str) -> date:
    return datetime.strptime(s, '%Y%m%d').date()


def load_csv(conn: sqlite3.Connection, path: Path, table: str, keep_cols: list[str]) -> None:
    """Stream a GTFS CSV file into a SQLite table, keeping only keep_cols."""
    with open(path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        header: list[str] | None = None
        batch: list[tuple] = []
        ph = ''

        for row in reader:
            if header is None:
                header = [c for c in keep_cols if c in row]
                cols_def = ', '.join(f'"{c}" TEXT' for c in header)
                conn.execute(f'CREATE TABLE "{table}" ({cols_def})')
                ph = ','.join('?' * len(header))

            batch.append(tuple(row.get(c, '') for c in header))
            if len(batch) >= BATCH:
                conn.executemany(f'INSERT INTO "{table}" VALUES ({ph})', batch)
                batch.clear()

        if batch and header is not None:
            conn.executemany(f'INSERT INTO "{table}" VALUES ({ph})', batch)


def build_service_dates(conn: sqlite3.Connection, gtfs_dir: Path) -> None:
    """Expand calendar.txt + calendar_dates.txt into a service_dates table."""
    conn.execute('CREATE TABLE service_dates (service_id TEXT, date TEXT)')

    cal = gtfs_dir / 'calendar.txt'
    if cal.exists():
        batch: list[tuple[str, str]] = []
        with open(cal, newline='', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                sid = row['service_id']
                d = parse_date(row['start_date'])
                end = parse_date(row['end_date'])
                while d <= end:
                    if row[WEEKDAYS[d.weekday()]] == '1':
                        batch.append((sid, d.isoformat()))
                    d += timedelta(days=1)
                    if len(batch) >= BATCH:
                        conn.executemany('INSERT INTO service_dates VALUES (?,?)', batch)
                        batch.clear()
        if batch:
            conn.executemany('INSERT INTO service_dates VALUES (?,?)', batch)

    cald = gtfs_dir / 'calendar_dates.txt'
    if cald.exists():
        with open(cald, newline='', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                sid = row['service_id']
                d = parse_date(row['date']).isoformat()
                if row['exception_type'] == '1':
                    conn.execute(
                        'INSERT OR IGNORE INTO service_dates VALUES (?,?)', (sid, d))
                elif row['exception_type'] == '2':
                    conn.execute(
                        'DELETE FROM service_dates WHERE service_id=? AND date=?', (sid, d))

    conn.execute('CREATE INDEX idx_sd ON service_dates(service_id)')


def parse_coord(s: str) -> float | None:
    """Return float coordinate, or None if empty/zero/invalid."""
    try:
        v = float(s)
        return v if v != 0.0 else None
    except (ValueError, TypeError):
        return None


def main(gtfs_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    db_path = output_dir / 'pid_stops.sqlite'

    print(f"Building {db_path} ...")
    with sqlite3.connect(db_path) as conn:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=NORMAL')
        conn.execute('PRAGMA cache_size=-262144')  # 256 MB cache

        for table, filename, cols in [
            ('stops',      'stops.txt',      ['stop_id', 'stop_name', 'stop_lat', 'stop_lon',
                                              'parent_station']),
            ('routes',     'routes.txt',     ['route_id', 'route_short_name', 'route_type']),
            ('trips',      'trips.txt',      ['trip_id', 'route_id', 'service_id']),
            ('stop_times', 'stop_times.txt', ['trip_id', 'stop_id', 'departure_time', 'stop_sequence']),
        ]:
            p = gtfs_dir / filename
            if p.exists():
                print(f"  loading {filename} ...")
                load_csv(conn, p, table, cols)
            else:
                print(f"  WARNING: {filename} not found, skipping")

        print("  expanding calendar ...")
        build_service_dates(conn, gtfs_dir)

        conn.execute('CREATE INDEX idx_trips_sid ON trips(service_id)')
        conn.execute('CREATE INDEX idx_st_tid   ON stop_times(trip_id)')
        conn.execute('CREATE INDEX idx_st_sid   ON stop_times(stop_id)')

        # Compact summary: distinct (stop_id, date) pairs that have service.
        # SQLite streams this with the indexes above without materialising all rows.
        print("  computing stop_active_days ...")
        conn.execute('''
            CREATE TABLE stop_active_days AS
            SELECT DISTINCT st.stop_id, sd.date
            FROM stop_times st
            JOIN trips     t  ON st.trip_id   = t.trip_id
            JOIN service_dates sd ON t.service_id = sd.service_id
        ''')
        conn.execute('CREATE INDEX idx_sad ON stop_active_days(stop_id, date)')

        # Build a coordinate table: prefer own lat/lon, fall back to parent_station.
        print("  resolving stop coordinates ...")
        coords: dict[str, tuple[float, float]] = {}
        parent_of: dict[str, str] = {}

        has_parent_col = bool(conn.execute(
            "SELECT 1 FROM pragma_table_info('stops') WHERE name='parent_station'"
        ).fetchone())

        if has_parent_col:
            rows = conn.execute(
                'SELECT stop_id, stop_lat, stop_lon, parent_station FROM stops'
            ).fetchall()
        else:
            rows = [
                (sid, lat, lon, '')
                for sid, lat, lon in conn.execute(
                    'SELECT stop_id, stop_lat, stop_lon FROM stops'
                ).fetchall()
            ]

        for stop_id, lat_s, lon_s, parent in rows:
            lat = parse_coord(lat_s)
            lon = parse_coord(lon_s)
            if lat is not None and lon is not None:
                coords[stop_id] = (lat, lon)
            if parent:
                parent_of[stop_id] = parent

        # Second pass: fill in parent coordinates for stops missing their own.
        for stop_id, parent in parent_of.items():
            if stop_id not in coords and parent in coords:
                coords[stop_id] = coords[parent]

        # Build CBOR payload from the summary table.
        print("  building CBOR summary ...")
        active: dict[str, list[str]] = {}
        for stop_id, d in conn.execute(
            'SELECT stop_id, date FROM stop_active_days ORDER BY stop_id, date'
        ):
            active.setdefault(stop_id, []).append(d)

        stops_data = []
        skipped_no_coords = 0
        for stop_id, name in conn.execute('SELECT stop_id, stop_name FROM stops'):
            if stop_id not in active:
                continue
            if stop_id not in coords:
                skipped_no_coords += 1
                continue
            lat, lon = coords[stop_id]
            stops_data.append({
                'id':     stop_id,
                'name':   name,
                'lat':    lat,
                'lon':    lon,
                'pseudo': stop_id.startswith('T'),
                'dates':  active[stop_id],
            })

    if skipped_no_coords:
        print(f"  skipped {skipped_no_coords} active stops with no resolvable coordinates")

    cbor_path = output_dir / 'pid_stops.cbor'
    print(f"Writing {cbor_path} ({len(stops_data)} stops) ...")
    with open(cbor_path, 'wb') as f:
        cbor2.dump(stops_data, f)

    print("Done.")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f'Usage: {sys.argv[0]} <gtfs_dir> <output_dir>', file=sys.stderr)
        sys.exit(1)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
