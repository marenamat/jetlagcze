import init, { load_stops, filter_stops, get_date_bounds, get_zones } from './pkg/jetlagcze_frontend.js';

const DEFAULT_ZONES = ['P', '0', 'B'];

const status     = document.getElementById('status');
const dateFrom   = document.getElementById('date-from');
const dateTo     = document.getElementById('date-to');
const clearBtn   = document.getElementById('clear-btn');
const showPseudo = document.getElementById('show-pseudo');
const zoneFilter = document.getElementById('zone-filter');

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

function selectedZones() {
  const boxes = zoneFilter.querySelectorAll('input[type="checkbox"]');
  const result = [];
  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].checked) result.push(boxes[i].value);
  }
  return result;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderStops(stops) {
  clusterGroup.clearLayers();
  for (const s of stops) {
    const marker = L.marker([s.lat, s.lon]);
    marker.bindPopup('<b>' + s.name + '</b><br><small>' + s.id + (s.zone ? ' [' + s.zone + ']' : '') + '</small>');
    clusterGroup.addLayer(marker);
  }
  status.textContent = stops.length + ' stop' + (stops.length !== 1 ? 's' : '');
}

function applyFilter() {
  const dates = dateRange(dateFrom.value, dateTo.value);
  const zones = selectedZones();
  try {
    const stops = filter_stops(JSON.stringify(dates), JSON.stringify(zones), showPseudo.checked);
    renderStops(stops);
  } catch (e) {
    status.textContent = 'Filter error: ' + e;
  }
}

function buildZoneCheckboxes(zones) {
  zoneFilter.textContent = '';
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const lbl = document.createElement('label');
    const cb  = document.createElement('input');
    cb.type  = 'checkbox';
    cb.value = z;
    cb.checked = DEFAULT_ZONES.indexOf(z) !== -1;
    cb.addEventListener('change', applyFilter);
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(' ' + z));
    zoneFilter.appendChild(lbl);
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
showPseudo.addEventListener('change', function () {
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

    const zones = get_zones();
    if (zones && zones.length > 0) {
      buildZoneCheckboxes(zones);
    } else {
      zoneFilter.textContent = '(no zone data)';
    }

    status.textContent = 'Loaded ' + count + ' stops';
    applyFilter();
  } catch (e) {
    status.textContent = 'Error: ' + e;
  }
}());
