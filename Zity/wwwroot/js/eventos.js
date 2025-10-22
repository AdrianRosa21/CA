// ===== Setup =====
const currentUserId = 'demo-user-1';

let stagedLatLng = null;
let events = [];
let leafletMarkers = [];
let eventModal;

const exportBtn = document.getElementById('exportJson');
const importBtn = document.getElementById('importJsonBtn');
const importInput = document.getElementById('importJson');
const statsBox = document.getElementById('stats');
const tbody = document.querySelector('#tablaEventos tbody');
const evtCards = document.getElementById('evtCards');
const outsideToast = new bootstrap.Toast(document.getElementById('toastOutside'), { delay: 2500 });

const evtForm = document.getElementById('evtForm');
const latInput = evtForm.elements['lat'];
const lngInput = evtForm.elements['lng'];
const descEl = evtForm.elements['descripcion'];
const descCount = document.getElementById('descCount');
const fotoInput = document.getElementById('foto');
const fotoPreview = document.getElementById('fotoPreview');

const map = L.map('map', { zoomControl: true, maxBoundsViscosity: 0.8 });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);

// ==== Cerca de SSE (misma que incidencias) ====
const SSE_GEOJSON = {
    type: "Feature",
    properties: { name: "San Salvador Este (DEMO)" },
    geometry: { type: "Polygon", coordinates: [[[-89.24, 13.82], [-89.10, 13.82], [-89.10, 13.66], [-89.24, 13.66], [-89.24, 13.82]]] }
};

// ==== Municipios DEMO (CORREGIDO dentro de SSE) ====
const MUNICIPIOS_GEOJSON = {
    type: "FeatureCollection",
    features: [
        // Soyapango (dentro del fence)
        {
            type: "Feature",
            properties: { name: "Soyapango" },
            geometry: {
                type: "Polygon", coordinates: [[
                    [-89.18, 13.66], [-89.12, 13.66], [-89.12, 13.74], [-89.18, 13.74], [-89.18, 13.66]
                ]]
            }
        },
        // Ilopango (ajustado al límite ESTE -89.10)
        {
            type: "Feature",
            properties: { name: "Ilopango" },
            geometry: {
                type: "Polygon", coordinates: [[
                    [-89.12, 13.66], [-89.10, 13.66], [-89.10, 13.76], [-89.12, 13.76], [-89.12, 13.66]
                ]]
            }
        },
        // Ciudad Delgado (ok)
        {
            type: "Feature",
            properties: { name: "Ciudad Delgado" },
            geometry: {
                type: "Polygon", coordinates: [[
                    [-89.21, 13.70], [-89.15, 13.70], [-89.15, 13.78], [-89.21, 13.78], [-89.21, 13.70]
                ]]
            }
        },
        // Tonacatepeque (ajustado al ESTE -89.10)
        {
            type: "Feature",
            properties: { name: "Tonacatepeque" },
            geometry: {
                type: "Polygon", coordinates: [[
                    [-89.13, 13.76], [-89.10, 13.76], [-89.10, 13.82], [-89.13, 13.82], [-89.13, 13.76]
                ]]
            }
        },
        // San Martín (ajustado al ESTE -89.10)
        {
            type: "Feature",
            properties: { name: "San Martín" },
            geometry: {
                type: "Polygon", coordinates: [[
                    [-89.16, 13.70], [-89.10, 13.70], [-89.10, 13.78], [-89.16, 13.78], [-89.16, 13.70]
                ]]
            }
        }
    ]
};
// Pintar cercas
const fenceLayer = L.geoJSON(SSE_GEOJSON, { style: { color: '#0d6efd', weight: 2, fillOpacity: 0.06 } }).addTo(map);
const municipiosLayer = L.geoJSON(MUNICIPIOS_GEOJSON, { style: { color: '#198754', weight: 1.5, fillOpacity: 0.05 } }).addTo(map);
map.fitBounds(fenceLayer.getBounds(), { padding: [20, 20] });
map.setMaxBounds(fenceLayer.getBounds().pad(0.2));

// Etiquetas de municipios
MUNICIPIOS_GEOJSON.features.forEach(f => {
    const c = turf.centerOfMass(f).geometry.coordinates;
    L.marker([c[1], c[0]], { icon: L.divIcon({ html: `<div class="badge text-bg-success" style="opacity:.9">${f.properties.name}</div>`, className: '', iconSize: [0, 0] }) }).addTo(map);
});

// ==== Helpers ====
const uuid = () => (crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);
function insideFence(latlng) { return turf.booleanPointInPolygon(turf.point([latlng.lng, latlng.lat]), SSE_GEOJSON); }
function getMunicipio(latlng) {
    const pt = turf.point([latlng.lng, latlng.lat]);
    for (const f of MUNICIPIOS_GEOJSON.features) if (turf.booleanPointInPolygon(pt, f)) return f.properties.name;
    return null;
}
function pad(n) { return String(n).padStart(2, '0'); }
function fmtFechaHora(d = new Date()) {
    return { fecha: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`, hora: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
function escapeHtml(s = '') { return s.replace(/[&<>"'`=\/]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[m])); }
function truncate(s = '', n = 120) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function sevClass(tipo) {
    switch ((tipo || '').toLowerCase()) {
        case 'privado': return 'text-danger';
        case 'con registro': return 'text-warning';
        default: return 'text-success';
    }
}
function makeDivIcon(icon = 'calendar-event', tipo = 'Abierto') {
    const cls = sevClass(tipo);
    const html = `<div class="bg-white rounded-circle border shadow-sm d-flex align-items-center justify-content-center" style="width:28px;height:28px;">
    <i class="bi bi-${icon} ${cls}" style="font-size:16px;line-height:1;"></i></div>`;
    return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] });
}

// ==== UI map click ====
map.on('click', (e) => {
    if (!insideFence(e.latlng)) { outsideToast.show(); map.flyTo(fenceLayer.getBounds().getCenter(), Math.max(map.getZoom(), 13), { duration: .6 }); return; }
    stagedLatLng = e.latlng;
    latInput.value = e.latlng.lat.toFixed(6);
    lngInput.value = e.latlng.lng.toFixed(6);
    document.getElementById('municipio').value = getMunicipio(e.latlng) || 'Fuera de municipios definidos';
    if (!eventModal) eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
    eventModal.show();
});

// preview
fotoInput.addEventListener('change', () => {
    const f = fotoInput.files?.[0];
    if (!f) { fotoPreview.classList.add('d-none'); return; }
    fotoPreview.src = URL.createObjectURL(f);
    fotoPreview.classList.remove('d-none');
});

// contador
function updateDescCounter() { descCount.textContent = `${(descEl.value || '').length}/120`; }
descEl.addEventListener('input', updateDescCounter); updateDescCounter();

// upload
async function uploadFoto(file) {
    const fd = new FormData(); fd.append('foto', file);
    const r = await fetch(window.__ZITY_UPLOAD_URL__, { method: 'POST', body: fd });
    const j = await r.json(); if (!j.ok) throw new Error(j.message || 'No se pudo subir');
    return j.url;
}

// tarjetas
function cardTemplate(ev) {
    const chips = `
    <span class="evt-chip me-2"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(ev.municipio || '-')}</span>
    <span class="evt-chip"><i class="bi bi-tag me-1"></i>${escapeHtml(ev.categoria)}</span>`;
    return `
    <div class="col-md-6 col-lg-4" id="card-${ev.id}">
      <article class="card shadow-sm h-100 position-relative overflow-hidden">
        <span class="evt-date">${ev.fecha} · ${ev.hora}</span>
        <img src="${ev.coverUrl || 'https://images.unsplash.com/photo-1514512364185-4c2b1a1a3a2b?q=80&w=1200&auto=format&fit=crop'}" class="card-img-top" alt="Banner evento">
        <div class="card-body">
          <h5 class="card-title mb-1">${escapeHtml(ev.titulo)}</h5>
          <p class="mb-2 text-muted">${escapeHtml(ev.ciudad || '')}</p>
          <div class="mb-2">${chips}</div>
          <p class="card-text mb-2">${escapeHtml(truncate(ev.descripcion || '', 120))}</p>
          <div class="d-flex align-items-center justify-content-between">
            <div class="rating d-flex" data-ev="${ev.id}">
              ${[1, 2, 3, 4, 5].map(n => `<button class="btn star-btn" data-star="${n}"><i class="bi ${(ev.ratings?.byUser?.[currentUserId] || 0) >= n ? 'bi-star-fill' : 'bi-star'}"></i></button>`).join('')}
            </div>
            <div class="small text-muted"><span id="avg-${ev.id}">${(ev.ratings?.avg || 0).toFixed(1)}</span> (<span id="cnt-${ev.id}">${ev.ratings?.count || 0}</span>)</div>
          </div>
        </div>
      </article>
    </div>`;
}
function addEventCard(ev) {
    evtCards.insertAdjacentHTML('afterbegin', cardTemplate(ev));
    const ratingEl = evtCards.querySelector(`.rating[data-ev="${ev.id}"]`);
    ratingEl?.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => handleRate(ev.id, Number(btn.dataset.star)));
    });
    if (ev.ratings?.byUser?.[currentUserId]) disableRating(ev.id);
}
function disableRating(id) {
    evtCards.querySelectorAll(`.rating[data-ev="${id}"] .star-btn`).forEach(b => b.disabled = true);
}
function refreshStars(id) {
    const ev = events.find(x => x.id === id); if (!ev) return;
    const my = ev.ratings?.byUser?.[currentUserId] || 0;
    const ratingEl = evtCards.querySelector(`.rating[data-ev="${id}"]`);
    ratingEl?.querySelectorAll('.star-btn').forEach(b => {
        const n = Number(b.dataset.star);
        b.innerHTML = `<i class="bi ${my >= n ? 'bi-star-fill' : 'bi-star'}"></i>`;
    });
    document.getElementById(`avg-${id}`).textContent = (ev.ratings?.avg || 0).toFixed(1);
    document.getElementById(`cnt-${id}`).textContent = ev.ratings?.count || 0;
}
function handleRate(id, score) {
    const ev = events.find(x => x.id === id); if (!ev) return;
    ev.ratings = ev.ratings || { byUser: {} };
    if (ev.ratings.byUser[currentUserId]) { disableRating(id); return; }
    ev.ratings.byUser[currentUserId] = score;
    const vals = Object.values(ev.ratings.byUser).map(Number);
    ev.ratings.count = vals.length;
    ev.ratings.avg = vals.reduce((a, b) => a + b, 0) / ev.ratings.count;
    disableRating(id); refreshStars(id);
}

// tabla + stats
function updateStats() {
    const total = events.length;
    const tipos = { Abierto: 0, "Con registro": 0, Privado: 0 };
    for (const e of events) { tipos[e.nivel_urgencia] = (tipos[e.nivel_urgencia] || 0) + 1; }
    statsBox.innerHTML = `
    <div class="fw-semibold mb-1">Resumen</div>
    <div class="small">Total eventos: <b>${total}</b></div>
    <div class="small">Abierto: <b>${tipos.Abierto || 0}</b> · Con registro: <b>${tipos["Con registro"] || 0}</b> · Privado: <b>${tipos.Privado || 0}</b></div>`;
}
function renderTable() {
    tbody.innerHTML = events.map(ev => `
    <tr>
      <td class="ps-3">
        <div class="d-flex align-items-start gap-2">
          <i class="bi bi-calendar-event ${sevClass(ev.nivel_urgencia)} fs-5 mt-1"></i>
          <div>
            <div class="fw-semibold lh-sm">${escapeHtml(ev.titulo)}</div>
            ${ev.direccion_referencial ? `<div class="text-muted small"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(ev.direccion_referencial)}</div>` : ''}
          </div>
        </div>
      </td>
      <td class="fw-semibold">${escapeHtml(ev.ciudad || '-')}</td>
      <td class="fw-semibold">${escapeHtml(ev.municipio || '-')}</td>
      <td class="text-nowrap">${ev.hora}</td>
      <td class="text-nowrap">${ev.fecha}</td>
      <td>${escapeHtml(ev.nivel_urgencia || '-')}</td>
    </tr>`).join('');
}

// marcador
function addLeafletMarker(ev) {
    const m = L.marker([ev.lat, ev.lng], { icon: makeDivIcon('calendar-event', ev.nivel_urgencia) }).addTo(map);
    const imgHtml = ev.coverUrl ? `<img src="${ev.coverUrl}" style="width:100%;max-width:220px;border-radius:8px;margin-bottom:6px">` : '';
    m.bindPopup(`
    <div class="small">
      ${imgHtml}
      <div class="fw-semibold">${escapeHtml(ev.titulo)}</div>
      <div>${escapeHtml(ev.categoria)} — Tipo: ${escapeHtml(ev.nivel_urgencia)}</div>
      <div class="mt-1">${escapeHtml(ev.ciudad)} · ${ev.hora} · ${ev.fecha}</div>
      ${ev.municipio ? `<div><b>Municipio:</b> ${escapeHtml(ev.municipio)}</div>` : ''}
      ${ev.descripcion ? `<div class="mt-1"><b>Desc:</b> ${escapeHtml(ev.descripcion)}</div>` : ''}
      ${ev.direccion_referencial ? `<div><b>Dir:</b> ${escapeHtml(ev.direccion_referencial)}</div>` : ''}
    </div>`);
    leafletMarkers.push(m);
}

// submit
evtForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!stagedLatLng) { alert('Elige una ubicación en el mapa.'); return; }
    const fotoFile = fotoInput.files?.[0]; if (!fotoFile) { alert('Adjunta un banner.'); return; }
    const coverUrl = await uploadFoto(fotoFile);

    const data = Object.fromEntries(new FormData(evtForm).entries());
    const desc = (data.descripcion || '').trim();
    if (desc.length > 120) { alert('Descripción máx. 120.'); return; }

    // Fecha/hora: si se llenan los inputs, úsalo; si no, usa actual
    let { fecha, hora } = fmtFechaHora();
    if (data.fecha_input) fecha = data.fecha_input.split('-').reverse().join('/').slice(0, 8);
    if (data.hora_input) hora = data.hora_input;

    const id = uuid();
    const ev = {
        id,
        titulo: (data.titulo || '').trim(),
        categoria: data.categoria,
        nivel_urgencia: data.nivel_urgencia, // usamos este campo como "tipo"
        ciudad: data.ciudad || 'San Salvador',
        municipio: (document.getElementById('municipio')?.value || '').trim(),
        descripcion: desc,
        direccion_referencial: (data.direccion_referencial || '').trim(),
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        fecha, hora,
        coverUrl,
        ratings: { avg: 0, count: 0, byUser: {} }
    };

    events.unshift(ev);
    addLeafletMarker(ev);
    updateStats();
    renderTable();
    addEventCard(ev);

    evtForm.reset();
    fotoPreview.classList.add('d-none');
    updateDescCounter();
    stagedLatLng = null;
    eventModal?.hide();
});

// export/import
exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ eventos: events }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'eventos.json'; a.click();
    URL.revokeObjectURL(url);
});
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
        const text = await file.text(); const json = JSON.parse(text);
        leafletMarkers.forEach(m => m.remove()); leafletMarkers = [];
        events = Array.isArray(json.eventos) ? json.eventos : [];
        evtCards.innerHTML = '';
        events.forEach(ev => { addLeafletMarker(ev); addEventCard(ev); });
        updateStats(); renderTable();
        alert(`Importados ${events.length} eventos.`);
    } catch { alert('Archivo JSON inválido.'); }
    finally { importInput.value = ''; }
});

// inicio
updateStats(); renderTable();
