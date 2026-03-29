#!/usr/bin/env python3
"""
Generate pid_stops_times.cbor: departure times per stop per date.

Usage: process_gtfs_times.py <gtfs_dir> <output_dir>

Output: <output_dir>/pid_stops_times.cbor
  [{id: str, by_date: {date: [minute, ...]}}]
  minute = minutes from midnight (may exceed 1439 for past-midnight departures)
"""

import cbor2
import csv
import sqlite3
import sys
from datetime import date, timedelta, datetime
from pathlib import Path

WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
BATCH = 50_000


def parse_date(s: str) -> date:
    return datetime.strptime(s, '%Y%m%d').date()


def time_to_minutes(s: str) -> int:
    h, m, _ = s.split(':')
    return int(h) * 60 + int(m)


def build_service_dates(conn: sqlite3.Connection, gtfs_dir: Path) -> None:
    conn.execute('CREATE TABLE service_dates (service_id TEXT, date TEXT)')

    cal = gtfs_dir / 'calendar.txt'
    if cal.exists():
        rows: list[tuple[str, str]] = []
        with open(cal, newline='', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                sid = row['service_id']
                d = parse_date(row['start_date'])
                end = parse_date(row['end_date'])
                while d <= end:
                    if row[WEEKDAYS[d.weekday()]] == '1':
                        rows.append((sid, d.isoformat()))
                    d += timedelta(days=1)
                    if len(rows) >= BATCH:
                        conn.executemany('INSERT INTO service_dates VALUES (?,?)', rows)
                        rows.clear()
        if rows:
            conn.executemany('INSERT INTO service_dates VALUES (?,?)', rows)

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


def load_trips(conn: sqlite3.Connection, gtfs_dir: Path) -> None:
    conn.execute('CREATE TABLE trips (trip_id TEXT PRIMARY KEY, service_id TEXT)')
    rows = []
    with open(gtfs_dir / 'trips.txt', newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            rows.append((row['trip_id'], row['service_id']))
            if len(rows) >= BATCH:
                conn.executemany('INSERT INTO trips VALUES (?,?)', rows)
                rows.clear()
    if rows:
        conn.executemany('INSERT INTO trips VALUES (?,?)', rows)
    conn.execute('CREATE INDEX idx_trips_sid ON trips(service_id)')


def load_stop_minutes(conn: sqlite3.Connection, gtfs_dir: Path) -> None:
    conn.execute('CREATE TABLE stop_minutes (trip_id TEXT, stop_id TEXT, minutes INT)')
    rows = []
    with open(gtfs_dir / 'stop_times.txt', newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            rows.append((row['trip_id'], row['stop_id'],
                         time_to_minutes(row['departure_time'])))
            if len(rows) >= BATCH:
                conn.executemany('INSERT INTO stop_minutes VALUES (?,?,?)', rows)
                rows.clear()
    if rows:
        conn.executemany('INSERT INTO stop_minutes VALUES (?,?,?)', rows)
    conn.execute('CREATE INDEX idx_sm_tid ON stop_minutes(trip_id)')


def main(gtfs_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    tmp_db = output_dir / '_times_work.sqlite'

    print("Building working database...")
    with sqlite3.connect(tmp_db) as conn:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=NORMAL')
        conn.execute('PRAGMA cache_size=-262144')  # 256 MB

        print("  loading trips...")
        load_trips(conn, gtfs_dir)
        print("  expanding calendar...")
        build_service_dates(conn, gtfs_dir)
        print("  loading stop_times...")
        load_stop_minutes(conn, gtfs_dir)

        print("Querying departure times by stop and date...")
        query = '''
            SELECT sm.stop_id, sd.date, sm.minutes
            FROM   stop_minutes sm
            JOIN   trips        t  ON sm.trip_id   = t.trip_id
            JOIN   service_dates sd ON t.service_id = sd.service_id
            ORDER  BY sm.stop_id, sd.date, sm.minutes
        '''

        result = []
        current_stop: str | None = None
        by_date: dict[str, list[int]] = {}

        for stop_id, d, minutes in conn.execute(query):
            if stop_id != current_stop:
                if current_stop is not None:
                    result.append({'id': current_stop, 'by_date': by_date})
                current_stop = stop_id
                by_date = {}
            by_date.setdefault(d, []).append(int(minutes))

        if current_stop is not None:
            result.append({'id': current_stop, 'by_date': by_date})

    tmp_db.unlink(missing_ok=True)

    cbor_path = output_dir / 'pid_stops_times.cbor'
    print(f"Writing {cbor_path} ({len(result)} stops)...")
    with open(cbor_path, 'wb') as f:
        cbor2.dump(result, f)

    print("Done.")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f'Usage: {sys.argv[0]} <gtfs_dir> <output_dir>', file=sys.stderr)
        sys.exit(1)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
