import init, { load_stops, filter_stops, get_date_bounds, get_zones, load_times, stop_stats } from './pkg/jetlagcze_frontend.js';

const DEFAULT_ZONES = ['P', '0', 'B'];

const status          = document.getElementById('status');
const dateFrom        = document.getElementById('date-from');
const dateTo          = document.getElementById('date-to');
const clearBtn        = document.getElementById('clear-btn');
const showPseudo      = document.getElementById('show-pseudo');
const zoneFilter      = document.getElementById('zone-filter');
const coverageToggle  = document.getElementById('coverage-toggle');
const freqInterval    = document.getElementById('freq-interval');
const freqIntVal      = document.getElementById('freq-interval-val');
const freqStart       = document.getElementById('freq-start');
const freqStartVal    = document.getElementById('freq-start-val');
const freqEnd         = document.getElementById('freq-end');
const freqEndVal      = document.getElementById('freq-end-val');
const freqCutoff      = document.getElementById('freq-cutoff');
const freqCutoffNum   = document.getElementById('freq-cutoff-num');

const map          = window.map;
const clusterGroup = window.clusterGroup;

// ── State ─────────────────────────────────────────────────────────────────────

let timesReady = false;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(h) { return `${h}:00`; }
function fmtF(v) { return v.toFixed(2); }

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

// ── Coverage overlay ──────────────────────────────────────────────────────────
//
// Draws a semi-transparent red layer over map areas farther than 1 km from
// any currently displayed stop. Uses canvas compositing: fill red, then erase
// 1 km circles around each stop (destination-out).

const CoverageLayer = L.Layer.extend({
  initialize() {
    this._stops   = [];
    this._enabled = true;
  },

  onAdd(map) {
    this._map    = map;
    this._canvas = L.DomUtil.create('canvas', 'coverage-canvas');
    this._canvas.style.cssText = 'position:absolute;pointer-events:none;';
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on('moveend zoomend resize', this._redraw, this);
    this._redraw();
  },

  onRemove(map) {
    map.getPanes().overlayPane.removeChild(this._canvas);
    map.off('moveend zoomend resize', this._redraw, this);
    this._canvas = null;
  },

  setStops(stops) {
    this._stops = stops;
    if (this._canvas) this._redraw();
  },

  setEnabled(enabled) {
    this._enabled = enabled;
    if (this._canvas) this._redraw();
  },

  /** Convert meters to canvas pixels at the given latitude. */
  _metersToPixels(meters, lat) {
    const zoom = this._map.getZoom();
    const latRad = lat * Math.PI / 180;
    const metersPerPixel = 156543.03392 * Math.cos(latRad) / Math.pow(2, zoom);
    return meters / metersPerPixel;
  },

  _redraw() {
    if (!this._canvas) return;
    const map    = this._map;
    const size   = map.getSize();
    const canvas = this._canvas;

    canvas.width  = size.x;
    canvas.height = size.y;

    // Align canvas with map container top-left (accounting for pane offset).
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size.x, size.y);

    if (!this._enabled) return;

    // Fill entire canvas with semi-transparent red.
    ctx.fillStyle = 'rgba(200,0,0,0.35)';
    ctx.fillRect(0, 0, size.x, size.y);

    if (this._stops.length === 0) return;

    // Erase 1 km circles around each displayed stop using destination-out.
    // This makes covered areas fully transparent, revealing the map beneath.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';

    const bounds  = map.getBounds();
    const south   = bounds.getSouth();
    const north   = bounds.getNorth();
    const west    = bounds.getWest();
    const east    = bounds.getEast();
    // Rough padding: 1 km ≈ 0.009° lat, use 0.015° for safety.
    const PAD = 0.015;

    for (let i = 0; i < this._stops.length; i++) {
      const s = this._stops[i];

      // Coarse geographic filter: skip stops definitely beyond 1 km of viewport.
      if (s.lat < south - PAD || s.lat > north + PAD) continue;
      if (s.lon < west  - PAD || s.lon > east  + PAD) continue;

      const pt = map.latLngToContainerPoint([s.lat, s.lon]);
      const r  = this._metersToPixels(1000, s.lat);

      // Skip circles that don't overlap the canvas at all.
      if (pt.x + r < 0 || pt.x - r > size.x) continue;
      if (pt.y + r < 0 || pt.y - r > size.y) continue;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  },
});

const coverageLayer = new CoverageLayer();

function currentDates() {
  return dateRange(dateFrom.value, dateTo.value);
}

function freqParams() {
  return {
    interval: parseInt(freqInterval.value, 10),
    startH:   parseInt(freqStart.value, 10),
    endH:     parseInt(freqEnd.value, 10),
  };
}

// ── Frequency popup ───────────────────────────────────────────────────────────

function buildPopup(stop, dates) {
  const { interval, startH, endH } = freqParams();
  const zoneTag = stop.zone ? ' [' + stop.zone + ']' : '';

  if (!timesReady) {
    return `<b>${stop.name}</b><br><small>${stop.id}${zoneTag}</small>
            <p class="freq-loading">Loading frequency data…</p>`;
  }

  const stats = stop_stats(
    stop.id,
    JSON.stringify(dates),
    startH * 60,
    endH * 60,
    interval,
  );

  if (!stats) {
    return `<b>${stop.name}</b><br><small>${stop.id}${zoneTag}</small>
            <p class="freq-loading">No departure data for this stop.</p>`;
  }

  return `<b>${stop.name}</b><br><small>${stop.id}${zoneTag}</small>
          <div class="freq-stats">
            Departures per ${interval} min window
            (${fmt(startH)}–${fmt(endH)},
             ${dates.length > 0 ? dates.length + ' day(s)' : 'all days'}):<br>
            <table>
              <tr><td>min</td><td>${fmtF(stats.min)}</td></tr>
              <tr><td>max</td><td>${fmtF(stats.max)}</td></tr>
              <tr><td>avg</td><td>${fmtF(stats.avg)}</td></tr>
              <tr><td>median</td><td>${fmtF(stats.median)}</td></tr>
              <tr><td>p5</td><td>${fmtF(stats.p5)}</td></tr>
              <tr><td>p95</td><td>${fmtF(stats.p95)}</td></tr>
              <tr><td>std dev</td><td>${fmtF(stats.std_dev)}</td></tr>
            </table>
          </div>`;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

let currentStops = [];

function renderStops(stops) {
  currentStops = stops;
  clusterGroup.clearLayers();
  const dates = currentDates();
  for (const s of stops) {
    const marker = L.marker([s.lat, s.lon]);
    marker.bindPopup(() => buildPopup(s, dates));
    clusterGroup.addLayer(marker);
  }
  status.textContent = stops.length + ' stop' + (stops.length !== 1 ? 's' : '');
  coverageLayer.setStops(stops);
}

function applyFilter() {
  const dates = currentDates();
  const zones = selectedZones();
  try {
    let stops = filter_stops(JSON.stringify(dates), JSON.stringify(zones), showPseudo.checked);

    // Apply frequency cutoff: hide stops where avg departures < cutoff.
    // Only active when times data is loaded and cutoff > 0.
    const cutoff = parseFloat(freqCutoff.value);
    if (timesReady && cutoff > 0) {
      const { startH, endH, interval } = freqParams();
      const datesJson = JSON.stringify(dates);
      stops = stops.filter(function (s) {
        const stats = stop_stats(s.id, datesJson, startH * 60, endH * 60, interval);
        return stats && stats.avg >= cutoff;
      });
    }

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
coverageToggle.addEventListener('change', function () {
  coverageLayer.setEnabled(coverageToggle.checked);
});

freqInterval.addEventListener('input', () => {
  freqIntVal.textContent = freqInterval.value + ' min';
  if (timesReady && parseFloat(freqCutoff.value) > 0) applyFilter();
});
freqStart.addEventListener('input', () => {
  freqStartVal.textContent = fmt(freqStart.value);
  if (+freqStart.value > +freqEnd.value) freqEnd.value = freqStart.value;
  if (timesReady && parseFloat(freqCutoff.value) > 0) applyFilter();
});
freqEnd.addEventListener('input', () => {
  freqEndVal.textContent = fmt(freqEnd.value);
  if (+freqEnd.value < +freqStart.value) freqStart.value = freqEnd.value;
  if (timesReady && parseFloat(freqCutoff.value) > 0) applyFilter();
});
freqCutoff.addEventListener('input', () => {
  freqCutoffNum.value = freqCutoff.value;
  if (timesReady) applyFilter();
});
freqCutoffNum.addEventListener('input', () => {
  const v = Math.min(5, Math.max(0, parseFloat(freqCutoffNum.value) || 0));
  freqCutoff.value = v;
  if (timesReady) applyFilter();
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────

(async function () {
  try {
    await init();

    // Add coverage layer to map (default on).
    coverageLayer.addTo(map);

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
      var today = new Date().toISOString().slice(0, 10);
      if (today >= bounds[0] && today <= bounds[1]) {
        dateFrom.value = today;
        dateTo.value   = today;
      } else {
        dateFrom.value = bounds[0];
        dateTo.value   = bounds[1];
      }
    }

    const zones = get_zones();
    if (zones && zones.length > 0) {
      buildZoneCheckboxes(zones);
    } else {
      zoneFilter.textContent = '(no zone data)';
    }

    status.textContent = 'Loaded ' + count + ' stops';
    applyFilter();

    // Load departure-times data in the background.
    fetch('./pid_stops_times.cbor')
      .then(r => r.ok ? r.arrayBuffer() : Promise.reject('HTTP ' + r.status))
      .then(buf => {
        load_times(new Uint8Array(buf));
        timesReady = true;
        applyFilter(); // re-filter now that frequency cutoff can be applied
      })
      .catch(e => console.warn('Could not load times data:', e));

  } catch (e) {
    status.textContent = 'Error: ' + e;
  }
}());
