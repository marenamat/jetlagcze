use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashSet;
use wasm_bindgen::prelude::*;

#[derive(Deserialize, Clone)]
struct Stop {
    id: String,
    name: String,
    lat: f64,
    lon: f64,
    dates: Vec<String>,
}

#[derive(Serialize)]
struct StopOut {
    id: String,
    name: String,
    lat: f64,
    lon: f64,
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

/// Return stops active on every date in `dates` (JSON array of "YYYY-MM-DD" strings).
/// An empty array means no filter — all stops are returned.
#[wasm_bindgen]
pub fn filter_stops(dates_json: &str) -> Result<JsValue, JsValue> {
    let selected: Vec<String> = serde_json::from_str(dates_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let required: HashSet<&str> = selected.iter().map(String::as_str).collect();

    let result: Vec<StopOut> = STOPS.with(|stops| {
        stops
            .borrow()
            .iter()
            .filter(|s| {
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
            })
            .collect()
    });

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}
