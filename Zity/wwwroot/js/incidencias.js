// ===== Simulación de usuario actual =====
const currentUserId = 'demo-user-1';

// ===== Estado =====
let stagedLatLng = null;
let markers = [];         // incidencias en memoria
let leafletMarkers = [];
let reportModal;

// ===== UI =====
const exportBtn = document.getElementById('exportJson');
const importBtn = document.getElementById('importJsonBtn');
const importInput = document.getElementById('importJson');
const statsBox = document.getElementById('stats');
const tbody = document.querySelector('#tablaIncidencias tbody');
const incCards = document.getElementById('incCards');
const outsideToastEl = document.getElementById('toastOutside');
const outsideToast = outsideToastEl ? new bootstrap.Toast(outsideToastEl, { delay: 2500 }) : null;

// Form
const incForm = document.getElementById('incForm');
const latInput = incForm.elements['lat'];
const lngInput = incForm.elements['lng'];
const descEl = incForm.elements['descripcion'];
const descCount = document.getElementById('descCount');
const fotoInput = document.getElementById('foto');
const fotoPreview = document.getElementById('fotoPreview');

// ===== Mapa =====
const map = L.map('map', { zoomControl: true, maxBoundsViscosity: 0.8 });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
}).addTo(map);

// --------- GEOJSON de San Salvador Este (DEMO RECTÁNGULO) ---------
const SSE_GEOJSON = {
    type: "Feature", properties: { name: "San Salvador Este (DEMO)" },
    geometry: {
        type: "Polygon", coordinates: [[
            [-89.24, 13.82], [-89.10, 13.82], [-89.10, 13.66], [-89.24, 13.66], [-89.24, 13.82]
        ]]
    }
};
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

// Dibuja límites de municipios
const municipiosLayer = L.geoJSON(MUNICIPIOS_GEOJSON, {
    style: { color: '#198754', weight: 1.5, fillOpacity: 0.05 }
}).addTo(map);

// Etiquetas sencillas en el centroide
MUNICIPIOS_GEOJSON.features.forEach(f => {
    const center = turf.centerOfMass(f).geometry.coordinates; // [lng, lat]
    L.marker([center[1], center[0]], {
        icon: L.divIcon({
            html: `<div class="badge text-bg-success" style="opacity:.9">${f.properties.name}</div>`,
            className: '', iconSize: [0, 0]
        })
    }).addTo(map);
});

function getMunicipio(latlng) {
    const pt = turf.point([latlng.lng, latlng.lat]);
    for (const f of MUNICIPIOS_GEOJSON.features) {
        if (turf.booleanPointInPolygon(pt, f)) return f.properties.name;
    }
    return null;
}


// Dibujar cerca y centrar
const fenceLayer = L.geoJSON(SSE_GEOJSON, { style: { color: '#0d6efd', weight: 2, fillOpacity: 0.08 } }).addTo(map);
const fenceBounds = fenceLayer.getBounds();
const fenceCenter = fenceBounds.getCenter();
map.fitBounds(fenceBounds, { padding: [20, 20] });
map.setMaxBounds(fenceBounds.pad(0.2));

// ===== Helpers =====
const uuid = () => (crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);

function insideFence(latlng) {
    const pt = turf.point([latlng.lng, latlng.lat]);
    return turf.booleanPointInPolygon(pt, SSE_GEOJSON);
}
function sevColorClass(sev) {
    switch ((sev || '').toLowerCase()) {
        case 'critica': return 'text-danger';
        case 'alta': return 'text-orange';
        case 'media': return 'text-warning';
        default: return 'text-success';
    }
}
function makeDivIcon(iconName, sev) {
    const cls = sevColorClass(sev);
    const html = `
    <div class="bg-white rounded-circle border shadow-sm d-flex align-items-center justify-content-center"
         style="width:28px;height:28px;">
      <i class="bi bi-${iconName} ${cls}" style="font-size:16px;line-height:1;"></i>
    </div>`;
    return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] });
}
function fmtFechaHora(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return {
        fecha: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`,
        hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
}
function escapeHtml(str = '') { return str.replace(/[&<>"'`=\/]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' }[s])); }
function truncate(s = '', n = 70) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ===== Pins + UI =====
function addLeafletMarker(item) {
    const m = L.marker([item.lat, item.lng], { icon: makeDivIcon(item.icono || 'exclamation-circle-fill', item.severidad) }).addTo(map);
    const imgHtml = item.coverUrl ? `<img src="${item.coverUrl}" style="width:100%;max-width:220px;border-radius:8px;margin-bottom:6px">` : '';
    m.bindPopup(`
    <div class="small">
      ${imgHtml}
      <div class="fw-semibold">${escapeHtml(item.titulo)}</div>
      <div>${escapeHtml(item.categoria)} — Sev: ${escapeHtml(item.severidad)}</div>
      <div class="mt-1">${escapeHtml(item.ciudad)} · ${item.hora} · ${item.fecha}</div>
      ${item.municipio ? `<div><b>Municipio:</b> ${escapeHtml(item.municipio)}</div>` : ''}

      ${item.descripcion ? `<div class="mt-1"><b>Desc:</b> ${escapeHtml(item.descripcion)}</div>` : ''}
      ${item.direccion_referencial ? `<div><b>Dir:</b> ${escapeHtml(item.direccion_referencial)}</div>` : ''}
      <div class="text-muted">${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</div>
    </div>
  `);
    leafletMarkers.push(m);
}

function updateStats() {
    const total = markers.length;
    const agg = { baja: 0, media: 0, alta: 0, critica: 0 };
    for (const it of markers) { const k = (it.severidad || '').toLowerCase(); agg[k] = (agg[k] || 0) + 1; }
    statsBox.innerHTML = `
    <div class="fw-semibold mb-1">Resumen</div>
    <div class="small">Total pines: <b>${total}</b></div>
    <div class="small">baja: <b>${agg.baja || 0}</b> · media: <b>${agg.media || 0}</b> · alta: <b>${agg.alta || 0}</b> · critica: <b>${agg.critica || 0}</b></div>`;
}

function renderTable() {
    tbody.innerHTML = markers.map(it => `
    <tr>
      <td class="ps-3">
        <div class="d-flex align-items-start gap-2">
          <i class="bi bi-${it.icono || 'exclamation-circle-fill'} ${sevColorClass(it.severidad)} fs-5 mt-1"></i>
          <div>
            <div class="fw-semibold lh-sm">${escapeHtml(it.titulo)}</div>
            ${it.descripcion ? `<div class="text-muted small">${escapeHtml(truncate(it.descripcion, 70))}</div>` : ''}
            ${it.direccion_referencial ? `<div class="text-muted small"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(it.direccion_referencial)}</div>` : ''}
          </div>
        </div>
      </td>
      <td class="fw-semibold">${escapeHtml(it.ciudad || '-')}</td>
      <td class="fw-semibold">${escapeHtml(it.municipio || '-')}</td> 
      <td class="text-nowrap">${it.hora}</td>
      <td class="text-nowrap">${it.fecha}</td>
      <td>${escapeHtml(it.nivel_urgencia || '-')}</td>
    </tr>`).join('');
}

// ==== Cards con rating ====
function cardTemplate(it) {
    const avg = (it.ratings?.avg || 0).toFixed(1);
    const count = it.ratings?.count || 0;
    const stars = [1, 2, 3, 4, 5].map(n => `<button class="btn star-btn" data-star="${n}" aria-label="${n} estrellas"><i class="bi ${(it.ratings?.byUser?.[currentUserId] || 0) >= n ? 'bi-star-fill' : 'bi-star'}"></i></button>`).join('');
    return `
    <div class="col-md-6 col-lg-4" id="card-${it.id}">
      <article class="card shadow-sm h-100">
        <img src="${it.coverUrl || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop'}" class="card-img-top" alt="Incidencia">
        <div class="card-body">
          <h5 class="card-title mb-1">${escapeHtml(it.titulo)}</h5>
          <p class="card-text text-muted mb-2">${escapeHtml(it.ciudad || '')}</p>
          <p class="card-text mb-1">Urgencia: <strong class="${sevColorClass(it.severidad)} text-capitalize">${escapeHtml(it.severidad)}</strong></p>
          <p class="card-text mb-2">Fecha: <strong>${it.fecha}</strong></p>
          <p class="card-text text-muted mb-1">${escapeHtml(it.municipio || '')}</p>

          <div class="d-flex align-items-center justify-content-between">
            <div class="rating d-flex" data-incidencia="${it.id}">
              ${stars}
            </div>
            <div class="small text-muted"><span id="avg-${it.id}">${avg}</span> (<span id="cnt-${it.id}">${count}</span>)</div>
          </div>
        </div>
      </article>
    </div>`;
}
function addIncidentCard(it) {
    incCards.insertAdjacentHTML('afterbegin', cardTemplate(it));
    const ratingEl = incCards.querySelector(`.rating[data-incidencia="${it.id}"]`);
    ratingEl?.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => handleRate(it.id, Number(btn.dataset.star)));
    });
    if (it.ratings?.byUser?.[currentUserId]) disableRating(it.id);
}
function disableRating(incId) {
    const ratingEl = incCards.querySelector(`.rating[data-incidencia="${incId}"]`);
    ratingEl?.querySelectorAll('.star-btn').forEach(b => b.disabled = true);
}
function refreshStars(incId) {
    const it = markers.find(x => x.id === incId);
    if (!it) return;
    const ratingEl = incCards.querySelector(`.rating[data-incidencia="${incId}"]`);
    const my = it.ratings?.byUser?.[currentUserId] || 0;
    ratingEl?.querySelectorAll('.star-btn').forEach(btn => {
        const n = Number(btn.dataset.star);
        btn.innerHTML = `<i class="bi ${my >= n ? 'bi-star-fill' : 'bi-star'}"></i>`;
    });
    const avgEl = document.getElementById(`avg-${incId}`);
    const cntEl = document.getElementById(`cnt-${incId}`);
    if (avgEl) avgEl.textContent = (it.ratings?.avg || 0).toFixed(1);
    if (cntEl) cntEl.textContent = it.ratings?.count || 0;
}
function handleRate(incId, score) {
    const it = markers.find(x => x.id === incId);
    if (!it) return;
    it.ratings = it.ratings || { byUser: {} };
    if (it.ratings.byUser[currentUserId]) {
        disableRating(incId); return;
    }
    it.ratings.byUser[currentUserId] = score;
    const vals = Object.values(it.ratings.byUser).map(Number);
    it.ratings.count = vals.length;
    it.ratings.avg = vals.reduce((a, b) => a + b, 0) / it.ratings.count;
    disableRating(incId);
    refreshStars(incId);
}

// ===== Interacciones mapa y modal =====
map.on('click', (e) => {
    if (!insideFence(e.latlng)) {
        outsideToast?.show();
        map.flyTo([fenceCenter.lat, fenceCenter.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
        return;
    }
    stagedLatLng = e.latlng;
    const muni = getMunicipio(e.latlng);
    const muniInput = document.getElementById('municipio');
    muniInput.value = muni || 'Fuera de municipios definidos';

    if (!muni) {
        
         outsideToast?.show(); return;
    }


    latInput.value = stagedLatLng.lat.toFixed(6);
    lngInput.value = stagedLatLng.lng.toFixed(6);
    if (!reportModal) reportModal = new bootstrap.Modal(document.getElementById('reportModal'));
    reportModal.show();
});

// preview de foto
fotoInput?.addEventListener('change', async () => {
    const f = fotoInput.files?.[0];
    if (!f) { fotoPreview?.classList.add('d-none'); return; }
    const url = URL.createObjectURL(f);
    fotoPreview.src = url;
    fotoPreview.classList.remove('d-none');
});

// contador de descripción
function updateDescCounter() {
    const len = (descEl?.value || '').length;
    if (descCount) descCount.textContent = `${len}/70`;
}
descEl?.addEventListener('input', updateDescCounter);
updateDescCounter();

// === Subida de foto al servidor ===
async function uploadFoto(file) {
    const fd = new FormData();
    fd.append("foto", file);
    const r = await fetch(window.__ZITY_UPLOAD_URL__, { method: "POST", body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.message || "No se pudo subir la imagen");
    return j.url; // url pública en /Uploads/...
}

// Guardar incidencia
incForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
        if (!stagedLatLng) { alert('Haz clic en el mapa para elegir ubicación.'); return; }

        // Foto obligatoria -> subir al servidor
        const fotoFile = fotoInput.files?.[0];
        if (!fotoFile) { alert('Debes adjuntar una foto.'); return; }
        const coverUrl = await uploadFoto(fotoFile);

        const data = Object.fromEntries(new FormData(incForm).entries());
        const desc = (data.descripcion || '').trim();
        if (desc.length > 70) { alert('La descripción debe tener máximo 70 caracteres.'); return; }

        const { fecha, hora } = fmtFechaHora();
        const incId = uuid();

        const fileObj = {
            id_archivo: uuid(),
            objetivo_tipo: 'incidencia',
            id_objetivo: incId,
            url_archivo: coverUrl,
            descripcion: 'Evidencia principal',
            fecha_subida: new Date().toISOString(),
            id_usuario_propietario: currentUserId,
            censura: false
        };

        const item = {
            id: incId,
            titulo: (data.titulo || '').trim(),
            categoria: data.categoria,
            severidad: data.severidad,
            ciudad: data.ciudad || 'San Salvador',
            nivel_urgencia: data.nivel_urgencia || 'Baja',
            municipio: (document.getElementById('municipio')?.value || '').trim(),
            icono: data.icono || 'exclamation-circle-fill',
            descripcion: desc,
            direccion_referencial: (data.direccion_referencial || '').trim(),
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lng),
            fecha, hora,
            coverUrl,
            archivos: [fileObj],
            ratings: { avg: 0, count: 0, byUser: {} }
        };

        markers.unshift(item);
        addLeafletMarker(item);
        updateStats();
        renderTable();
        addIncidentCard(item);

        incForm.reset();
        fotoPreview.classList.add('d-none');
        updateDescCounter();
        stagedLatLng = null;
        reportModal?.hide();
    } catch (err) {
        alert(err.message || "Error al guardar incidencia");
    }
});

// Export / Import
exportBtn?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ incidencias: markers }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'incidencias.json'; a.click();
    URL.revokeObjectURL(url);
});
importBtn?.addEventListener('click', () => importInput.click());
importInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
        const text = await file.text();
        const json = JSON.parse(text);
        leafletMarkers.forEach(m => m.remove()); leafletMarkers = [];
        markers = Array.isArray(json.incidencias) ? json.incidencias : [];
        incCards.innerHTML = '';
        markers.forEach(it => { it.icono ||= 'exclamation-circle-fill'; addLeafletMarker(it); addIncidentCard(it); });
        updateStats(); renderTable();
        alert(`Importadas ${markers.length} incidencias.`);
    } catch { alert('Archivo JSON inválido.'); }
    finally { importInput.value = ''; }
});

// Render inicial
updateStats(); renderTable();