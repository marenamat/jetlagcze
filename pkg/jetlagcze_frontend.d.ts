/* tslint:disable */
/* eslint-disable */

/**
 * Return stops active on every date in `dates` (JSON array of "YYYY-MM-DD" strings)
 * and in one of the zones in `zones_json` (JSON array of strings; empty = all zones).
 * If show_pseudo is false, stops marked as pseudo (routing nodes) are excluded.
 */
export function filter_stops(dates_json: string, zones_json: string, show_pseudo: boolean): any;

/**
 * Return [min_date, max_date] across all loaded stops, or null if no stops loaded.
 */
export function get_date_bounds(): any;

/**
 * Return zone IDs sorted by distance from Prague: P, 0, B, 1, 2, …, then "-".
 * Comma-separated zones (e.g. "6,7") are split into separate entries.
 */
export function get_zones(): any;

/**
 * Load stop data from a CBOR byte slice.
 * Must be called once before filter_stops.
 */
export function load_stops(cbor_bytes: Uint8Array): number;

/**
 * Load departure-times data from a CBOR byte slice.
 * Can be called asynchronously after load_stops.
 */
export function load_times(cbor_bytes: Uint8Array): number;

/**
 * Search stops by name (case-insensitive substring match).
 * Returns up to 20 results sorted by distance from (center_lat, center_lon).
 */
export function search_stops(query: string, center_lat: number, center_lon: number): any;

/**
 * Compute frequency statistics for a single stop over selected dates.
 *
 * - `stop_id`: the stop to analyse
 * - `dates_json`: JSON array of "YYYY-MM-DD" strings (empty = all loaded dates)
 * - `start_min`: start of relevant time window (minutes from midnight), inclusive
 * - `end_min`: end of relevant time window, inclusive
 * - `interval_min`: window size I (minutes)
 *
 * Returns a JSON object {min, max, avg, median, p5, p95, std_dev}
 * where each value is the average number of departures per day in a
 * sliding interval of `interval_min` minutes, sampled at 1-minute granularity.
 * Returns null if no data is available.
 */
export function stop_stats(stop_id: string, dates_json: string, start_min: number, end_min: number, interval_min: number): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly filter_stops: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly get_date_bounds: () => any;
    readonly get_zones: () => any;
    readonly load_stops: (a: number, b: number) => [number, number, number];
    readonly load_times: (a: number, b: number) => [number, number, number];
    readonly search_stops: (a: number, b: number, c: number, d: number) => any;
    readonly stop_stats: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
