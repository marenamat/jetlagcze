import init, { load_stops, filter_stops } from './pkg/jetlagcze_frontend.js';

const status  = document.getElementById('status');
const dateFrom = document.getElementById('date-from');
const dateTo   = document.getElementById('date-to');
const clearBtn = document.getElementById('clear-btn');

// ── Map setup ────────────────────────────────────────────────────────────────

const map = L.map('map').setView([50.08, 14.44], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

const clusterGroup = L.markerClusterGroup({ chunkedLoading: true });
map.addLayer(clusterGroup);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate all ISO dates between start and end (inclusive). */
function dateRange(start, end) {
  if (!start || !end || start > end) return start ? [start] : [];
  const dates = [];
  const d = new Date(start + 'T00:00:00Z');
  const last = new Date(end   + 'T00:00:00Z');
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
    marker.bindPopup(`<b>${s.name}</b><br><small>${s.id}</small>`);
    clusterGroup.addLayer(marker);
  }
  status.textContent = `${stops.length} stop${stops.length !== 1 ? 's' : ''}`;
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

dateFrom.addEventListener('change', () => {
  if (dateTo.value && dateTo.value < dateFrom.value) dateTo.value = dateFrom.value;
  applyFilter();
});
dateTo.addEventListener('change', () => {
  if (dateFrom.value && dateFrom.value > dateTo.value) dateFrom.value = dateTo.value;
  applyFilter();
});
clearBtn.addEventListener('click', () => {
  dateFrom.value = '';
  dateTo.value   = '';
  applyFilter();
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────

(async () => {
  try {
    await init();

    status.textContent = 'Fetching stop data…';
    const res = await fetch('./pid_stops.cbor');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();

    const count = load_stops(new Uint8Array(buf));
    status.textContent = `Loaded ${count} stops`;

    applyFilter();
  } catch (e) {
    status.textContent = 'Error: ' + e;
  }
})();
