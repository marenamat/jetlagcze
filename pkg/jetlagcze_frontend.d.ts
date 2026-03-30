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

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly filter_stops: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly get_date_bounds: () => any;
    readonly get_zones: () => any;
    readonly load_stops: (a: number, b: number) => [number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
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
