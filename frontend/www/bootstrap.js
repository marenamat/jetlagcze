import init, { load_stops, filter_stops, get_date_bounds, get_zones, load_times, stop_stats, search_stops } from './pkg/jetlagcze_frontend.js';

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
const stopSearch      = document.getElementById('stop-search');
const searchDropdown  = document.getElementById('search-dropdown');

const map          = window.map;
const clusterGroup = window.clusterGroup;

// ── State ─────────────────────────────────────────────────────────────────────

let timesReady = false;
// stopId → 'show' | 'hide' (omitted key = default/filter behaviour)
const manualOverrides = {};
// All stops by id (populated after load_stops, used for override lookups).
let allStopsById = {};

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

// ── Ghost / highlight layers ──────────────────────────────────────────────────

// Ghost layer: always-hide stops, shown as gray dots, not counted in coverage.
const ghostLayer = L.layerGroup();
// Highlight layer: search-selected stop, shown as blue dot, not counted in coverage.
const highlightLayer = L.layerGroup();

function makeCircleIcon(color, size) {
  const s = size || 10;
  return L.divIcon({
    className: '',
    html: '<div style="width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:' + color + ';border:1.5px solid rgba(0,0,0,0.4);box-sizing:border-box;"></div>',
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -s / 2 - 2],
  });
}

const ICON_GHOST  = makeCircleIcon('#999');
const ICON_SEARCH = makeCircleIcon('#00aaff', 14);

// ── Manual override ───────────────────────────────────────────────────────────

window.setStopOverride = function (id, state) {
  if (state === 'default') {
    delete manualOverrides[id];
  } else {
    manualOverrides[id] = state;
  }
  map.closePopup();
  applyFilter();
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const cur = manualOverrides[stop.id] || 'default';
  const sid = JSON.stringify(stop.id);

  const btnShow  = `<button class="ovr-btn${cur === 'show' ? ' active' : ''}" onclick="window.setStopOverride(${sid},'show')">Always show</button>`;
  const btnHide  = `<button class="ovr-btn${cur === 'hide' ? ' active' : ''}" onclick="window.setStopOverride(${sid},'hide')">Always hide</button>`;
  const btnReset = cur !== 'default' ? ` <button class="ovr-btn" onclick="window.setStopOverride(${sid},'default')">Reset</button>` : '';
  const overrideRow = `<div class="stop-override">${btnShow} ${btnHide}${btnReset}</div>`;

  if (!timesReady) {
    return `<b>${stop.name}</b><br><small>${stop.id}${zoneTag}</small>
            ${overrideRow}
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
            ${overrideRow}
            <p class="freq-loading">No departure data for this stop.</p>`;
  }

  return `<b>${stop.name}</b><br><small>${stop.id}${zoneTag}</small>
          ${overrideRow}
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

// ── Stop grouping ─────────────────────────────────────────────────────────────
//
// Stops sharing the same name are merged into a single marker at their average
// position. A popup button lets the user expand/collapse individual instances.

/** Group stops by name; compute average lat/lon for multi-stop groups. */
function groupStops(stops) {
  const byName = new Map();
  for (const s of stops) {
    if (!byName.has(s.name)) byName.set(s.name, []);
    byName.get(s.name).push(s);
  }
  const groups = [];
  for (const [name, members] of byName) {
    let lat = 0, lon = 0;
    for (const s of members) { lat += s.lat; lon += s.lon; }
    groups.push({ name, members, lat: lat / members.length, lon: lon / members.length });
  }
  return groups;
}

// name → array of individual markers currently shown for that group
const expandedGroups = new Map();

function collapseGroup(name, mergedMarker) {
  const indiv = expandedGroups.get(name);
  if (!indiv) return;
  for (const m of indiv) clusterGroup.removeLayer(m);
  expandedGroups.delete(name);
  clusterGroup.addLayer(mergedMarker);
}

function expandGroup(group, mergedMarker) {
  clusterGroup.removeLayer(mergedMarker);
  const indiv = group.members.map(function (s) {
    const m = L.marker([s.lat, s.lon]);
    m.bindPopup(function () {
      return buildPopup(s, currentDates()) +
        '<br><button class="collapse-btn">\u21A9 Collapse to single marker</button>';
    });
    m.on('popupopen', function () {
      const btn = m.getPopup().getElement().querySelector('.collapse-btn');
      if (btn) btn.onclick = function () { collapseGroup(group.name, mergedMarker); };
    });
    clusterGroup.addLayer(m);
    return m;
  });
  expandedGroups.set(group.name, indiv);
}

function makeMergedMarker(group) {
  const zones = [];
  const seen = new Set();
  for (const s of group.members) {
    if (s.zone) {
      for (const z of s.zone.split(',')) {
        const zt = z.trim();
        if (zt && zt !== '-' && !seen.has(zt)) { seen.add(zt); zones.push(zt); }
      }
    }
  }
  const zoneTag = zones.length > 0 ? ' [' + zones.join(',') + ']' : '';
  const m = L.marker([group.lat, group.lon]);
  m.bindPopup(
    '<b>' + group.name + '</b>' + zoneTag + '<br>' +
    '<small>' + group.members.length + ' stops</small><br>' +
    '<button class="expand-btn">Show all ' + group.members.length + ' instances</button>'
  );
  m.on('popupopen', function () {
    const btn = m.getPopup().getElement().querySelector('.expand-btn');
    if (btn) btn.onclick = function () {
      m.closePopup();
      expandGroup(group, m);
    };
  });
  return m;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

let currentStops = [];

function renderStops(stops) {
  currentStops = stops;
  // Clear any expanded group state and rebuild all markers from scratch.
  expandedGroups.clear();
  clusterGroup.clearLayers();

  const groups = groupStops(stops);
  for (const group of groups) {
    if (group.members.length === 1) {
      const s = group.members[0];
      const marker = L.marker([s.lat, s.lon]);
      marker.bindPopup(() => buildPopup(s, currentDates()));
      clusterGroup.addLayer(marker);
    } else {
      clusterGroup.addLayer(makeMergedMarker(group));
    }
  }

  status.textContent = stops.length + ' stop' + (stops.length !== 1 ? 's' : '') +
    ' (' + groups.length + ' location' + (groups.length !== 1 ? 's' : '') + ')';
  coverageLayer.setStops(stops);
}

function renderGhostStops() {
  ghostLayer.clearLayers();
  const dates = currentDates();
  for (const id of Object.keys(manualOverrides)) {
    if (manualOverrides[id] !== 'hide') continue;
    const s = allStopsById[id];
    if (!s) continue;
    const marker = L.marker([s.lat, s.lon], { icon: ICON_GHOST });
    marker.bindPopup(() => buildPopup(s, dates));
    ghostLayer.addLayer(marker);
  }
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

    // Apply manual overrides.
    const hideIds = new Set(Object.keys(manualOverrides).filter(id => manualOverrides[id] === 'hide'));
    const showIds = new Set(Object.keys(manualOverrides).filter(id => manualOverrides[id] === 'show'));

    // Remove always-hide stops from normal results.
    stops = stops.filter(s => !hideIds.has(s.id));

    // Add always-show stops not already in results.
    const presentIds = new Set(stops.map(s => s.id));
    for (const id of showIds) {
      if (!presentIds.has(id) && allStopsById[id]) {
        stops.push(allStopsById[id]);
      }
    }

    renderStops(stops);
    renderGhostStops();
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

// ── Search ────────────────────────────────────────────────────────────────────

function showSearchResult(s) {
  highlightLayer.clearLayers();
  const dates = currentDates();
  const marker = L.marker([s.lat, s.lon], { icon: ICON_SEARCH });
  marker.bindPopup(buildPopup(s, dates));
  highlightLayer.addLayer(marker);
  map.setView([s.lat, s.lon], Math.max(map.getZoom(), 15));
  marker.openPopup();
}

stopSearch.addEventListener('input', function () {
  const q = stopSearch.value.trim();
  if (q.length < 2) { searchDropdown.style.display = 'none'; return; }
  const center = map.getCenter();
  const results = search_stops(q, center.lat, center.lng);
  if (!results || results.length === 0) { searchDropdown.style.display = 'none'; return; }
  searchDropdown.innerHTML = '';
  for (let i = 0; i < results.length; i++) {
    const s = results[i];
    const div = document.createElement('div');
    div.className = 'search-item';
    div.textContent = s.name + (s.zone ? ' [' + s.zone + ']' : '');
    div.addEventListener('mousedown', function (e) {
      e.preventDefault();
      searchDropdown.style.display = 'none';
      stopSearch.value = '';
      showSearchResult(s);
    });
    searchDropdown.appendChild(div);
  }
  searchDropdown.style.display = 'block';
});

stopSearch.addEventListener('blur', function () {
  setTimeout(function () { searchDropdown.style.display = 'none'; }, 150);
});

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

    // Add layers to map.
    coverageLayer.addTo(map);
    ghostLayer.addTo(map);
    highlightLayer.addTo(map);

    status.textContent = 'Fetching stop data\u2026';
    const res = await fetch('./pid_stops.cbor');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = await res.arrayBuffer();

    const count = load_stops(new Uint8Array(buf));

    // Build id→stop lookup for manual override / search use.
    const allStops = filter_stops('[]', '[]', true);
    for (let i = 0; i < allStops.length; i++) {
      allStopsById[allStops[i].id] = allStops[i];
    }

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
