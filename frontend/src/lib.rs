use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

// ── Stop position/calendar data ───────────────────────────────────────────────

#[derive(Deserialize, Clone)]
struct Stop {
    id: String,
    name: String,
    lat: f64,
    lon: f64,
    #[serde(default)]
    zone: String,
    #[serde(default)]
    pseudo: bool,
    dates: Vec<String>,
}

#[derive(Serialize)]
struct StopOut {
    id: String,
    name: String,
    lat: f64,
    lon: f64,
    zone: String,
    pseudo: bool,
}

thread_local! {
    static STOPS: RefCell<Vec<Stop>> = RefCell::new(Vec::new());
}

/// Load stop data from a CBOR byte slice.
/// Must be called once before filter_stops.
#[wasm_bindgen]
pub fn load_stops(cbor_bytes: &[u8]) -> Result<usize, JsValue> {
    let stops: Vec<Stop> = ciborium::de::from_reader(std::io::Cursor::new(cbor_bytes))
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let count = stops.len();
    STOPS.with(|s| *s.borrow_mut() = stops);
    Ok(count)
}

/// Return [min_date, max_date] across all loaded stops, or null if no stops loaded.
#[wasm_bindgen]
pub fn get_date_bounds() -> JsValue {
    STOPS.with(|stops| {
        let stops = stops.borrow();
        let mut min_date = "9999-99-99".to_string();
        let mut max_date = "0000-00-00".to_string();
        let mut found = false;
        for stop in stops.iter() {
            for d in &stop.dates {
                if *d < min_date { min_date = d.clone(); }
                if *d > max_date { max_date = d.clone(); }
                found = true;
            }
        }
        if found {
            serde_wasm_bindgen::to_value(&[min_date, max_date]).unwrap_or(JsValue::NULL)
        } else {
            JsValue::NULL
        }
    })
}

/// Zone sort order: P, 0, B, 1, 2, …, 13, then "-", then anything else.
fn zone_order(z: &str) -> (u8, i32) {
    match z {
        "P"  => (0, 0),
        "0"  => (0, 1),
        "B"  => (0, 2),
        "-"  => (2, 0),
        _    => {
            if let Ok(n) = z.parse::<i32>() {
                (1, n)
            } else {
                (3, 0)
            }
        }
    }
}

/// Return zone IDs sorted by distance from Prague: P, 0, B, 1, 2, …, then "-".
/// Comma-separated zones (e.g. "6,7") are split into separate entries.
#[wasm_bindgen]
pub fn get_zones() -> JsValue {
    STOPS.with(|stops| {
        let stops = stops.borrow();
        let mut seen: HashSet<String> = HashSet::new();
        for stop in stops.iter() {
            if stop.zone.is_empty() {
                seen.insert("-".to_string());
            } else {
                for part in stop.zone.split(',') {
                    let z = part.trim();
                    if !z.is_empty() {
                        seen.insert(z.to_string());
                    }
                }
            }
        }
        let mut zones: Vec<String> = seen.into_iter().collect();
        zones.sort_by(|a, b| zone_order(a).cmp(&zone_order(b)));
        let zone_refs: Vec<&str> = zones.iter().map(String::as_str).collect();
        serde_wasm_bindgen::to_value(&zone_refs).unwrap_or(JsValue::NULL)
    })
}

/// Return stops active on every date in `dates` (JSON array of "YYYY-MM-DD" strings)
/// and in one of the zones in `zones_json` (JSON array of strings; empty = all zones).
/// If show_pseudo is false, stops marked as pseudo (routing nodes) are excluded.
#[wasm_bindgen]
pub fn filter_stops(dates_json: &str, zones_json: &str, show_pseudo: bool) -> Result<JsValue, JsValue> {
    let selected: Vec<String> = serde_json::from_str(dates_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let zone_filter: Vec<String> = serde_json::from_str(zones_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let required: HashSet<&str> = selected.iter().map(String::as_str).collect();
    let allowed_zones: HashSet<&str> = zone_filter.iter().map(String::as_str).collect();

    let result: Vec<StopOut> = STOPS.with(|stops| {
        stops
            .borrow()
            .iter()
            .filter(|s| {
                if s.pseudo && !show_pseudo {
                    return false;
                }
                if !allowed_zones.is_empty() {
                    let matches = if s.zone.is_empty() {
                        allowed_zones.contains("-")
                    } else {
                        s.zone.split(',')
                            .any(|z| allowed_zones.contains(z.trim()))
                    };
                    if !matches {
                        return false;
                    }
                }
                if required.is_empty() {
                    return true;
                }
                let have: HashSet<&str> = s.dates.iter().map(String::as_str).collect();
                required.iter().all(|&d| have.contains(d))
            })
            .map(|s| StopOut {
                id: s.id.clone(),
                name: s.name.clone(),
                lat: s.lat,
                lon: s.lon,
                zone: s.zone.clone(),
                pseudo: s.pseudo,
            })
            .collect()
    });

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

// ── Departure times / frequency data ─────────────────────────────────────────

#[derive(Deserialize)]
struct StopTimes {
    id: String,
    by_date: HashMap<String, Vec<u32>>,
}

#[derive(Serialize)]
pub struct FreqStats {
    pub min: f64,
    pub max: f64,
    pub avg: f64,
    pub median: f64,
    pub p5: f64,
    pub p95: f64,
    pub std_dev: f64,
}

thread_local! {
    static TIMES: RefCell<HashMap<String, HashMap<String, Vec<u32>>>> =
        RefCell::new(HashMap::new());
}

/// Load departure-times data from a CBOR byte slice.
/// Can be called asynchronously after load_stops.
#[wasm_bindgen]
pub fn load_times(cbor_bytes: &[u8]) -> Result<usize, JsValue> {
    let raw: Vec<StopTimes> = ciborium::de::from_reader(std::io::Cursor::new(cbor_bytes))
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let count = raw.len();
    let map: HashMap<String, HashMap<String, Vec<u32>>> = raw
        .into_iter()
        .map(|s| (s.id, s.by_date))
        .collect();
    TIMES.with(|t| *t.borrow_mut() = map);
    Ok(count)
}

/// Count departures in [t, t + interval) from a sorted list of minutes.
fn count_in_window(times: &[u32], t: u32, interval: u32) -> u32 {
    let lo = times.partition_point(|&x| x < t);
    let hi = times.partition_point(|&x| x < t + interval);
    (hi - lo) as u32
}

fn percentile(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = p / 100.0 * (sorted.len() - 1) as f64;
    let lo = idx.floor() as usize;
    let hi = idx.ceil() as usize;
    if lo == hi {
        sorted[lo]
    } else {
        sorted[lo] + (idx - lo as f64) * (sorted[hi] - sorted[lo])
    }
}

/// Compute frequency statistics for a single stop over selected dates.
///
/// - `stop_id`: the stop to analyse
/// - `dates_json`: JSON array of "YYYY-MM-DD" strings (empty = all loaded dates)
/// - `start_min`: start of relevant time window (minutes from midnight), inclusive
/// - `end_min`: end of relevant time window, inclusive
/// - `interval_min`: window size I (minutes)
///
/// Returns a JSON object {min, max, avg, median, p5, p95, std_dev}
/// where each value is the average number of departures per day in a
/// sliding interval of `interval_min` minutes, sampled at 1-minute granularity.
/// Returns null if no data is available.
#[wasm_bindgen]
pub fn stop_stats(
    stop_id: &str,
    dates_json: &str,
    start_min: u32,
    end_min: u32,
    interval_min: u32,
) -> Result<JsValue, JsValue> {
    let selected: Vec<String> = serde_json::from_str(dates_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let result = TIMES.with(|times| {
        let times = times.borrow();
        let by_date = match times.get(stop_id) {
            Some(d) => d,
            None => return None,
        };

        // Pick relevant dates.
        let dates: Vec<&Vec<u32>> = if selected.is_empty() {
            by_date.values().collect()
        } else {
            selected
                .iter()
                .filter_map(|d| by_date.get(d.as_str()))
                .collect()
        };

        if dates.is_empty() {
            return None;
        }

        let n_dates = dates.len() as f64;
        let n_t = (end_min.saturating_sub(start_min) + 1) as usize;

        // For each T, compute average departures per day across all dates.
        let mut freq_values: Vec<f64> = Vec::with_capacity(n_t);
        for t in start_min..=end_min {
            let total: u32 = dates
                .iter()
                .map(|times| count_in_window(times, t, interval_min))
                .sum();
            freq_values.push(total as f64 / n_dates);
        }

        let n = freq_values.len() as f64;
        let avg = freq_values.iter().sum::<f64>() / n;
        let variance = freq_values.iter().map(|v| (v - avg).powi(2)).sum::<f64>() / n;

        let mut sorted = freq_values.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());

        Some(FreqStats {
            min: sorted[0],
            max: *sorted.last().unwrap(),
            avg,
            median: percentile(&sorted, 50.0),
            p5: percentile(&sorted, 5.0),
            p95: percentile(&sorted, 95.0),
            std_dev: variance.sqrt(),
        })
    });

    match result {
        Some(stats) => {
            serde_wasm_bindgen::to_value(&stats).map_err(|e| JsValue::from_str(&e.to_string()))
        }
        None => Ok(JsValue::NULL),
    }
}

/// Search stops by name (case-insensitive substring match).
/// Returns up to 20 results sorted by distance from (center_lat, center_lon).
#[wasm_bindgen]
pub fn search_stops(query: &str, center_lat: f64, center_lon: f64) -> JsValue {
    let q = query.to_lowercase();
    let lat_cos = center_lat.to_radians().cos();

    let mut results: Vec<(f64, StopOut)> = STOPS.with(|stops| {
        stops.borrow().iter()
            .filter(|s| s.name.to_lowercase().contains(&q))
            .map(|s| {
                let dlat = s.lat - center_lat;
                let dlon = (s.lon - center_lon) * lat_cos;
                let dist2 = dlat * dlat + dlon * dlon;
                (dist2, StopOut {
                    id: s.id.clone(),
                    name: s.name.clone(),
                    lat: s.lat,
                    lon: s.lon,
                    zone: s.zone.clone(),
                    pseudo: s.pseudo,
                })
            })
            .collect()
    });

    results.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(20);

    let stops: Vec<StopOut> = results.into_iter().map(|(_, s)| s).collect();
    serde_wasm_bindgen::to_value(&stops).unwrap_or(JsValue::NULL)
}
