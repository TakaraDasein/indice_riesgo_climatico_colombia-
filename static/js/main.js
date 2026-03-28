/**
 * main.js — Plataforma de Riesgos Climáticos Colombia
 * Leaflet + Flask API
 */

// ── Config ──────────────────────────────────────────────
const RIESGO_TYPES = {
  riesgo_compuesto: { label: "Riesgo Compuesto", icon: "⚡", field: "idx_riesgo_compuesto", nivel: "nivel_riesgo_compuesto" },
  inundacion:       { label: "Inundación",        icon: "🌊", field: "idx_inundacion",       nivel: "nivel_inundacion"       },
  deslizamiento:    { label: "Deslizamiento",      icon: "⛰️",  field: "idx_deslizamiento",    nivel: "nivel_deslizamiento"    },
  incendio:         { label: "Incendio Forestal",  icon: "🔥", field: "idx_incendio",         nivel: "nivel_incendio"         },
  sequia:           { label: "Sequía",             icon: "☀️",  field: "idx_sequia",           nivel: "nivel_sequia"           },
  evento_extremo:   { label: "Evento Extremo",     icon: "🌪️", field: "idx_evento_extremo",   nivel: "nivel_evento_extremo"   },
};

const COLORES = {
  "Sin datos": "#d1d5db",
  "Bajo":      "#86efac",
  "Medio":     "#fde047",
  "Alto":      "#fb923c",
  "Muy Alto":  "#dc2626",
};

const BADGE_CLASS = {
  "Sin datos": "badge-sin",
  "Bajo":      "badge-bajo",
  "Medio":     "badge-medio",
  "Alto":      "badge-alto",
  "Muy Alto":  "badge-muy-alto",
};

// ── Estado ───────────────────────────────────────────────
let state = {
  riesgoActivo: "riesgo_compuesto",
  dptoFiltro: "",
  geojsonData: null,
  geojsonLayer: null,
  municipioSeleccionado: null,
};

// ── Mapa ─────────────────────────────────────────────────
const map = L.map("map", {
  center: [4.5, -74.5],
  zoom: 6,
  zoomControl: true,
});

// Tiles oscuros
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
  { maxZoom: 19, attribution: "CartoDB" }
).addTo(map);

// Capa de etiquetas encima
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
  { maxZoom: 19, pane: "overlayPane", attribution: "CartoDB" }
).addTo(map);

// ── Funciones de color ────────────────────────────────────
function getNivel(props, riesgo) {
  return props[RIESGO_TYPES[riesgo].nivel] || "Sin datos";
}

function getColor(props, riesgo) {
  return COLORES[getNivel(props, riesgo)] || COLORES["Sin datos"];
}

function estiloMunicipio(feature) {
  const color = getColor(feature.properties, state.riesgoActivo);
  return {
    fillColor: color,
    fillOpacity: feature.properties._highlight ? 0.9 : 0.7,
    color: "#1e293b",
    weight: 0.4,
    opacity: 1,
  };
}

// ── Carga GeoJSON ─────────────────────────────────────────
async function cargarMapa() {
  try {
    const res = await fetch("/api/municipios");
    if (!res.ok) throw new Error("Error cargando datos del mapa");
    state.geojsonData = await res.json();
    renderizarCapa();
    cargarStats();
    cargarDepartamentos();
  } catch (err) {
    console.error(err);
    alert("Error cargando el mapa. Asegúrate de haber ejecutado el script de procesamiento.");
  }
}

function renderizarCapa() {
  if (state.geojsonLayer) {
    map.removeLayer(state.geojsonLayer);
  }

  // Filtra por departamento si es necesario
  let features = state.geojsonData.features;
  if (state.dptoFiltro) {
    features = features.filter(f => {
      const d = (f.properties.departamento || "").toString().trim().toLowerCase();
      return d === state.dptoFiltro.toLowerCase();
    });
    // Zoom al departamento
    if (features.length > 0) {
      const tempLayer = L.geoJSON({ type: "FeatureCollection", features });
      map.fitBounds(tempLayer.getBounds(), { padding: [20, 20] });
    }
  }

  const filteredData = { ...state.geojsonData, features };

  state.geojsonLayer = L.geoJSON(filteredData, {
    style: estiloMunicipio,
    onEachFeature(feature, layer) {
      const p = feature.properties;
      const nivel = getNivel(p, state.riesgoActivo);
      const nombre = (p.municipio || "Municipio desconocido").toString().trim();
      const dpto = (p.departamento || "").toString().trim();

      layer.bindTooltip(
        `<strong>${nombre}</strong><br/>${dpto}<br/>
         <span style="color:${COLORES[nivel]};font-weight:700">${nivel}</span>`,
        { sticky: true, opacity: 0.95, className: "leaflet-tooltip-dark" }
      );

      layer.on({
        mouseover(e) {
          e.target.setStyle({ fillOpacity: 0.92, weight: 1.5, color: "#38bdf8" });
          e.target.bringToFront();
        },
        mouseout(e) {
          if (state.municipioSeleccionado !== layer) {
            state.geojsonLayer.resetStyle(e.target);
          }
        },
        click(e) {
          seleccionarMunicipio(p, layer);
        },
      });
    },
  }).addTo(map);
}

// ── Ficha de municipio ────────────────────────────────────
function seleccionarMunicipio(props, layer) {
  // Resetea el anterior
  if (state.municipioSeleccionado && state.municipioSeleccionado !== layer) {
    state.geojsonLayer.resetStyle(state.municipioSeleccionado);
  }

  state.municipioSeleccionado = layer;
  layer.setStyle({ fillOpacity: 0.92, weight: 2, color: "#38bdf8" });

  mostrarFicha(props);
}

function colorRiesgoValor(idx) {
  if (idx === 0) return "#9ca3af";
  if (idx <= 1) return "#86efac";
  if (idx <= 2.5) return "#fde047";
  if (idx <= 4) return "#fb923c";
  return "#dc2626";
}

function mostrarFicha(p) {
  const nombre = (p.municipio || "Municipio desconocido").toString();
  const dpto = (p.departamento || "").toString();
  const nivelCompuesto = p.nivel_riesgo_compuesto || "Sin datos";
  const idxCompuesto = parseFloat(p.idx_riesgo_compuesto || 0);

  const barras = [
    { label: "Inundación",   icon: "🌊", idx: parseFloat(p.idx_inundacion || 0),     count: parseInt(p.inundacion || 0),   color: "#38bdf8" },
    { label: "Deslizamiento",icon: "⛰️",  idx: parseFloat(p.idx_deslizamiento || 0),  count: parseInt(p.deslizamiento || 0),color: "#a78bfa" },
    { label: "Incendio",     icon: "🔥", idx: parseFloat(p.idx_incendio || 0),       count: parseInt(p.incendio || 0),     color: "#fb923c" },
    { label: "Sequía",       icon: "☀️",  idx: parseFloat(p.idx_sequia || 0),         count: parseInt(p.sequia || 0),       color: "#fde047" },
    { label: "Vientos/Tempestad", icon: "🌪️", idx: parseFloat(p.idx_evento_extremo || 0), count: parseInt(p.evento_extremo || 0), color: "#6ee7b7" },
  ];

  const htmlBarras = barras.map(b => `
    <div class="barra-row">
      <span class="barra-label">${b.icon} ${b.label}</span>
      <div class="barra-track">
        <div class="barra-fill" style="width:${(b.idx / 5 * 100).toFixed(1)}%;background:${b.color}"></div>
      </div>
      <span class="barra-valor">${b.count}</span>
    </div>
  `).join("");

  const totalEventos = parseInt(p.total_eventos || 0);
  const cod = (p.cod_municipio || "").toString().padStart(5, "0");

  document.getElementById("ficha-content").innerHTML = `
    <div class="ficha-muni-nombre">${nombre}</div>
    <div class="ficha-dpto">${dpto} · Código DIVIPOLA: ${cod}</div>

    <div class="ficha-riesgo-principal">
      <div>
        <div class="ficha-riesgo-label">Índice de Riesgo Compuesto</div>
        <div class="ficha-riesgo-valor" style="color:${colorRiesgoValor(idxCompuesto)}">${idxCompuesto.toFixed(1)}<small style="font-size:14px;font-weight:400">/5</small></div>
      </div>
      <div>
        <span class="ficha-riesgo-nivel ${BADGE_CLASS[nivelCompuesto] || 'badge-sin'}" style="padding:6px 14px;font-size:13px">${nivelCompuesto}</span>
      </div>
    </div>

    <div class="ficha-grid">
      ${barras.map(b => `
        <div class="ficha-card">
          <span class="ficha-card-icon">${b.icon}</span>
          <span class="ficha-card-label">${b.label}</span>
          <span class="ficha-card-valor" style="color:${b.color}">${b.count}</span>
          <span class="ficha-card-nivel" style="color:${colorRiesgoValor(b.idx)}">${nivelTexto(b.idx)}</span>
        </div>
      `).join("")}
      <div class="ficha-card" style="grid-column:span 2">
        <span class="ficha-card-icon">📊</span>
        <span class="ficha-card-label">Total eventos registrados</span>
        <span class="ficha-card-valor">${totalEventos}</span>
        <span class="ficha-card-nivel" style="color:var(--text-muted)">2019 – 2026</span>
      </div>
    </div>

    <div class="ficha-barra-titulo">DISTRIBUCIÓN POR TIPO</div>
    ${htmlBarras}

    <div class="ficha-fuente">Fuente: UNGRD · DANE · Datos: 2019–2026</div>
  `;

  document.getElementById("ficha").classList.remove("hidden");
}

function nivelTexto(idx) {
  if (idx === 0) return "Sin datos";
  if (idx <= 1) return "Bajo";
  if (idx <= 2.5) return "Medio";
  if (idx <= 4) return "Alto";
  return "Muy Alto";
}

document.getElementById("ficha-close").addEventListener("click", () => {
  document.getElementById("ficha").classList.add("hidden");
  if (state.municipioSeleccionado) {
    state.geojsonLayer.resetStyle(state.municipioSeleccionado);
    state.municipioSeleccionado = null;
  }
});

// ── Stats ─────────────────────────────────────────────────
async function cargarStats() {
  try {
    const res = await fetch("/api/stats");
    const data = await res.json();

    const niveles = data.niveles_riesgo || {};
    const total = data.total_municipios || 0;

    document.getElementById("stats-content").innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total municipios</span>
        <span class="stat-val">${total.toLocaleString()}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Con datos de riesgo</span>
        <span class="stat-val">${((total - (niveles["Sin datos"] || 0))).toLocaleString()}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
        ${Object.entries(niveles).map(([nivel, n]) => `
          <span class="stat-badge ${BADGE_CLASS[nivel] || 'badge-sin'}">${nivel}: ${n}</span>
        `).join("")}
      </div>
    `;

    // Top municipios
    const top = (data.top_municipios || []).slice(0, 10);
    document.getElementById("top-municipios-list").innerHTML = top.map((m, i) => `
      <div class="top-item" data-cod="${m.cod}" onclick="flyToMunicipio('${m.cod}')">
        <span class="top-rank">${i + 1}</span>
        <div style="flex:1;overflow:hidden">
          <div class="top-nombre">${(m.nombre || "").toString()}</div>
          <div class="top-dpto">${(m.departamento || "").toString()}</div>
        </div>
        <span class="top-count">${m.total_eventos}</span>
      </div>
    `).join("");

  } catch (err) {
    console.error("Error cargando stats:", err);
  }
}

// ── Departamentos ─────────────────────────────────────────
async function cargarDepartamentos() {
  try {
    const res = await fetch("/api/departamentos");
    const dptos = await res.json();
    const sel = document.getElementById("filtro-dpto");
    dptos.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error("Error cargando departamentos:", err);
  }
}

// ── Fly to municipio ──────────────────────────────────────
function flyToMunicipio(cod) {
  if (!state.geojsonLayer) return;
  state.geojsonLayer.eachLayer(layer => {
    const p = layer.feature && layer.feature.properties;
    if (p && String(p.cod_municipio).padStart(5, "0") === String(cod).padStart(5, "0")) {
      map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 10 });
      seleccionarMunicipio(p, layer);
    }
  });
}

// ── Event listeners ───────────────────────────────────────
document.querySelectorAll(".riesgo-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".riesgo-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.riesgoActivo = btn.dataset.riesgo;
    renderizarCapa();
    // Si hay ficha abierta, actualiza con nuevos datos
    if (state.municipioSeleccionado) {
      mostrarFicha(state.municipioSeleccionado.feature.properties);
    }
  });
});

document.getElementById("filtro-dpto").addEventListener("change", e => {
  state.dptoFiltro = e.target.value;
  if (!state.dptoFiltro) {
    // Resetea zoom a Colombia
    map.setView([4.5, -74.5], 6);
  }
  renderizarCapa();
});

// Toggle sidebar
document.getElementById("toggle-sidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.add("collapsed");
  document.getElementById("show-sidebar").classList.remove("hidden");
});

document.getElementById("show-sidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("collapsed");
  document.getElementById("show-sidebar").classList.add("hidden");
});

// ── Init ──────────────────────────────────────────────────
cargarMapa();
