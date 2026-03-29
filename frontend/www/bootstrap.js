import init, { load_stops, filter_stops, get_date_bounds } from './pkg/jetlagcze_frontend.js';

const status   = document.getElementById('status');
const dateFrom = document.getElementById('date-from');
const dateTo   = document.getElementById('date-to');
const clearBtn = document.getElementById('clear-btn');

const map          = window.map;
const clusterGroup = window.clusterGroup;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate all ISO dates between start and end (inclusive). */
function dateRange(start, end) {
  if (!start || !end || start > end) return start ? [start] : [];
  const dates = [];
  const d = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (d <= last) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderStops(stops) {
  clusterGroup.clearLayers();
  for (const s of stops) {
    const marker = L.marker([s.lat, s.lon]);
    marker.bindPopup('<b>' + s.name + '</b><br><small>' + s.id + '</small>');
    clusterGroup.addLayer(marker);
  }
  status.textContent = stops.length + ' stop' + (stops.length !== 1 ? 's' : '');
}

function applyFilter() {
  const dates = dateRange(dateFrom.value, dateTo.value);
  try {
    const stops = filter_stops(JSON.stringify(dates));
    renderStops(stops);
  } catch (e) {
    status.textContent = 'Filter error: ' + e;
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

dateFrom.addEventListener('change', function () {
  if (dateTo.value && dateTo.value < dateFrom.value) dateTo.value = dateFrom.value;
  applyFilter();
});
dateTo.addEventListener('change', function () {
  if (dateFrom.value && dateFrom.value > dateTo.value) dateFrom.value = dateTo.value;
  applyFilter();
});
clearBtn.addEventListener('click', function () {
  dateFrom.value = '';
  dateTo.value   = '';
  applyFilter();
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────

(async function () {
  try {
    await init();

    status.textContent = 'Fetching stop data\u2026';
    const res = await fetch('./pid_stops.cbor');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = await res.arrayBuffer();

    const count = load_stops(new Uint8Array(buf));
    const bounds = get_date_bounds();
    if (bounds) {
      dateFrom.min = bounds[0];
      dateFrom.max = bounds[1];
      dateTo.min   = bounds[0];
      dateTo.max   = bounds[1];
      dateFrom.value = bounds[0];
      dateTo.value   = bounds[1];
    }
    status.textContent = 'Loaded ' + count + ' stops';

    applyFilter();
  } catch (e) {
    status.textContent = 'Error: ' + e;
  }
}());
