import { useState, useMemo, useEffect } from 'react'
import {
  Zap, Waves, Mountain, Flame, Sun, Wind, X, Triangle, Users, Thermometer,
  MapPin, BarChart2, Check, Table2, Download,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  ReferenceLine,
} from 'recharts'
import {
  TIPOS_RIESGO, SCALE_ARRAYS,
  SIN_DATOS_COLOR, SELECTED_INDICATOR,
  getNivelBg, getNivelTextColor, getNivelColor,
  COMPARE_COLORS, SERIE_COLORS,
} from '../utils/riesgoColors'

const ICON_MAP = { Zap, Waves, Mountain, Flame, Sun, Wind, Triangle, Users, Thermometer }

// ── Tooltip personalizado para Recharts ───────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--text-secondary)' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Modal tabla de datos ──────────────────────────────────────────────────────
function TablaDatosModal({ municipio, onClose }) {
  if (!municipio) return null

  const cod = String(municipio.cod_municipio ?? '').padStart(5, '0')

  // Secciones de la tabla
  const secciones = [
    {
      titulo: 'Identificación',
      fuente: 'DANE / DIVIPOLA',
      filas: [
        { campo: 'Municipio',    valor: municipio.municipio ?? '—',                  unidad: '' },
        { campo: 'Departamento', valor: municipio.departamento ?? '—',               unidad: '' },
        { campo: 'Código DIVIPOLA', valor: cod,                                      unidad: '' },
      ],
    },
    {
      titulo: 'Amenaza — Eventos registrados (UNGRD 2019–2026)',
      fuente: 'Unidad Nacional para la Gestión del Riesgo de Desastres · datos.gov.co',
      filas: [
        { campo: 'Inundaciones / Crecientes / Avenidas', valor: municipio.inundacion ?? 0,      unidad: 'eventos' },
        { campo: 'Deslizamientos / Movimientos en masa', valor: municipio.deslizamiento ?? 0,   unidad: 'eventos' },
        { campo: 'Incendios forestales / cobertura',     valor: municipio.incendio ?? 0,        unidad: 'eventos' },
        { campo: 'Sequías / Heladas',                    valor: municipio.sequia ?? 0,          unidad: 'eventos' },
        { campo: 'Vendavales / Temporales / Granizadas', valor: municipio.evento_extremo ?? 0,  unidad: 'eventos' },
        { campo: 'Total eventos registrados',            valor: municipio.total_eventos ?? 0,   unidad: 'eventos', destacar: true },
      ],
    },
    {
      titulo: 'Índices de Amenaza normalizados (escala 0–5)',
      fuente: 'Calculado sobre registros UNGRD · normalización al percentil 95',
      filas: [
        { campo: 'Índice Inundación',      valor: fmtIdx(municipio.idx_inundacion),    unidad: '/ 5', nivel: municipio.nivel_inundacion },
        { campo: 'Índice Deslizamiento',   valor: fmtIdx(municipio.idx_deslizamiento), unidad: '/ 5', nivel: municipio.nivel_deslizamiento },
        { campo: 'Índice Incendio',        valor: fmtIdx(municipio.idx_incendio),      unidad: '/ 5', nivel: municipio.nivel_incendio },
        { campo: 'Índice Sequía',          valor: fmtIdx(municipio.idx_sequia),        unidad: '/ 5', nivel: municipio.nivel_sequia },
        { campo: 'Índice Evento Extremo',  valor: fmtIdx(municipio.idx_evento_extremo),unidad: '/ 5', nivel: municipio.nivel_evento_extremo },
        { campo: 'Índice Compuesto (UNGRD)', valor: fmtIdx(municipio.idx_riesgo_compuesto), unidad: '/ 5', nivel: municipio.nivel_riesgo_compuesto, destacar: true },
      ],
    },
    {
      titulo: 'Vulnerabilidad Socioeconómica (IPM · Censo 2018)',
      fuente: 'DANE · Índice de Pobreza Multidimensional · Censo Nacional 2018',
      filas: [
        { campo: 'IPM Total',       valor: fmtPct(municipio.ipm_total),    unidad: '%' },
        { campo: 'IPM Cabecera',    valor: fmtPct(municipio.ipm_cabecera), unidad: '%' },
        { campo: 'IPM Rural',       valor: fmtPct(municipio.ipm_rural),    unidad: '%' },
        { campo: 'Índice IPM (0–5)',valor: fmtIdx(municipio.idx_ipm),      unidad: '/ 5', nivel: municipio.nivel_ipm, destacar: true },
      ],
    },
    {
      titulo: 'Estrés Térmico (IDEAM)',
      fuente: 'IDEAM · Normales Climatológicas · estaciones meteorológicas',
      filas: [
        { campo: 'Temperatura media anual',   valor: fmtTemp(municipio.temp_media_anual), unidad: '°C' },
        { campo: 'Índice Temperatura (0–5)',  valor: fmtIdx(municipio.idx_temperatura),   unidad: '/ 5', nivel: municipio.nivel_temperatura, destacar: true },
      ],
    },
    {
      titulo: 'Índice Triangulado (amenaza + vulnerabilidad + clima)',
      fuente: 'Calculado · ponderación: IPM×0.30 · Inundación×0.20 · Desliz×0.20 · Temp×0.15 · Incendio×0.10 · Ext×0.05',
      filas: [
        { campo: 'Índice Triangulado (0–5)', valor: fmtIdx(municipio.idx_triangulado), unidad: '/ 5', nivel: municipio.nivel_triangulado, destacar: true },
      ],
    },
  ]

  function fmtIdx(v) {
    const n = Number(v)
    return (isNaN(n) || n === 0) ? '—' : n.toFixed(2)
  }
  function fmtPct(v) {
    const n = Number(v)
    return isNaN(n) ? '—' : n.toFixed(1)
  }
  function fmtTemp(v) {
    const n = Number(v)
    return isNaN(n) ? '—' : n.toFixed(1)
  }

  // Descarga CSV del municipio
  function descargarCSV() {
    const filas = [['Sección', 'Campo', 'Valor', 'Unidad', 'Fuente']]
    secciones.forEach(s => {
      s.filas.forEach(f => {
        const nivel = f.nivel ? ` (${f.nivel})` : ''
        filas.push([s.titulo, f.campo, `${f.valor}${nivel}`, f.unidad, s.fuente])
      })
    })
    const csv = filas.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `riesgo_${cod}_${municipio.municipio?.replace(/\s+/g, '_').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: '100%', maxWidth: 640,
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera modal */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Table2 size={14} style={{ color: 'var(--text-muted)' }} />
              Datos completos · {municipio.municipio}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {municipio.departamento} · DIVIPOLA {cod}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={descargarCSV}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-secondary)',
                fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Download size={11} /> Descargar CSV
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4, lineHeight: 1,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Cuerpo con scroll */}
        <div style={{ overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {secciones.map((sec) => (
            <div key={sec.titulo}>
              {/* Título sección */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                {sec.titulo}
              </div>
              {/* Tabla */}
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
              }}>
                {sec.filas.map((fila, fi) => (
                  <div
                    key={fi}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '7px 12px',
                      borderBottom: fi < sec.filas.length - 1 ? '1px solid var(--border)' : 'none',
                      background: fila.destacar ? 'var(--bg-elevated)' : 'transparent',
                      gap: 8,
                    }}
                  >
                    <span style={{
                      flex: 1, fontSize: 12,
                      color: fila.destacar ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: fila.destacar ? 600 : 400,
                    }}>
                      {fila.campo}
                    </span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: fila.valor === '—' ? 'var(--text-disabled)' : 'var(--text-primary)',
                      minWidth: 48,
                      textAlign: 'right',
                    }}>
                      {fila.valor}
                    </span>
                    {fila.unidad && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 28 }}>
                        {fila.unidad}
                      </span>
                    )}
                    {fila.nivel && fila.nivel !== 'Sin datos' && (
                      <span style={{
                        fontSize: 9, padding: '1px 7px',
                        borderRadius: 10,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        minWidth: 52, textAlign: 'center',
                      }}>
                        {fila.nivel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {/* Fuente */}
              <div style={{ fontSize: 9, color: 'var(--text-disabled)', marginTop: 4, paddingLeft: 2 }}>
                Fuente: {sec.fuente}
              </div>
            </div>
          ))}
        </div>

        {/* Pie modal */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border)',
          fontSize: 10,
          color: 'var(--text-disabled)',
          display: 'flex', alignItems: 'center', gap: 6,
          flexShrink: 0,
        }}>
          <BarChart2 size={11} strokeWidth={1.5} />
          Plataforma de Riesgos Climáticos Colombia · Datos 2018–2026 · Los conteos UNGRD han sido verificados contra la API pública de datos.gov.co
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function FichaMunicipio({
  municipio,
  onClose,
  riesgoActivo,
  geojson,
  municipiosComparar = [],
  onToggleComparar,
  onClearComparar,
}) {
  const [tabActivo, setTabActivo] = useState('riesgo_compuesto')
  const [serieTemporal, setSerieTemporal] = useState([])
  const [mostrarTabla, setMostrarTabla] = useState(false)
  const isOpen = !!municipio

  // Carga serie temporal cuando cambia el municipio
  useEffect(() => {
    if (!municipio?.cod_municipio) { setSerieTemporal([]); return }
    const cod = String(municipio.cod_municipio).padStart(5, '0')
    fetch(`/data/series/${cod}.json`)
      .then(r => r.json())
      .then(data => setSerieTemporal(data))
      .catch(() => setSerieTemporal([]))
  }, [municipio?.cod_municipio])

  // Calcular promedio anual de eventos del departamento (referencia)
  const deptAvgAnual = useMemo(() => {
    if (!municipio || !geojson) return null
    const dept = municipio.departamento
    const deptoMusnis = geojson.features.filter(
      f => f.properties?.departamento === dept
    )
    if (deptoMusnis.length === 0) return null
    const totalSum = deptoMusnis.reduce(
      (acc, f) => acc + Number(f.properties?.total_eventos || 0), 0
    )
    const YEARS = 7
    return (totalSum / deptoMusnis.length) / YEARS
  }, [municipio, geojson])

  // Calcular ranking dentro del departamento
  const rankingDept = useMemo(() => {
    if (!municipio || !geojson) return null
    const dept = municipio.departamento
    const tipoInfo = TIPOS_RIESGO[tabActivo]
    const field = tipoInfo?.field || 'idx_riesgo_compuesto'
    const myIdx = Number(municipio[field] || 0)

    const deptoMusnis = geojson.features
      .filter(f => f.properties?.departamento === dept)
      .map(f => Number(f.properties?.[field] || 0))
      .filter(v => v > 0)
      .sort((a, b) => b - a)

    const rank = deptoMusnis.findIndex(v => v <= myIdx) + 1
    return { rank: rank || deptoMusnis.length, total: deptoMusnis.length }
  }, [municipio, geojson, tabActivo])

  // Datos para RadarChart
  const radarData = useMemo(() => {
    if (!municipio) return []
    return Object.entries(TIPOS_RIESGO).map(([key, info]) => ({
      subject: info.label.replace('Riesgo ', '').replace('Vientos/', 'Vientos/\n'),
      value: Number(municipio[info.field] || 0),
      fullMark: 5,
      color: info.color,
    }))
  }, [municipio])

  // Datos para BarChart horizontal — resalta el tab activo
  const barData = useMemo(() => {
    if (!municipio) return []
    return Object.entries(TIPOS_RIESGO)
      .filter(([k]) => k !== 'riesgo_compuesto')
      .map(([key, info]) => ({
        key,
        name: info.label,
        value: Number(municipio[info.field] || 0),
        color: SCALE_ARRAYS[key]?.[3] ?? info.color,
        nivel: municipio[info.nivel] || 'Sin datos',
        isActive: key === tabActivo,
      }))
      .sort((a, b) => {
        // El tab activo siempre primero; el resto por valor descendente
        if (a.isActive && !b.isActive) return -1
        if (!a.isActive && b.isActive) return 1
        return b.value - a.value
      })
  }, [municipio, tabActivo])

  // ── Comparación multi-municipio ───────────────────────────
  const isInComparar = municipio
    ? municipiosComparar.some(m => String(m.cod_municipio) === String(municipio.cod_municipio))
    : false

  const canAddComparar = !isInComparar && municipiosComparar.length < 3

  const compareMusnisAll = useMemo(() => {
    if (!municipio) return municipiosComparar
    return [municipio, ...municipiosComparar.filter(
      m => String(m.cod_municipio) !== String(municipio.cod_municipio)
    )]
  }, [municipio, municipiosComparar])

  // Datos radar multi-municipio
  const multiRadarData = useMemo(() => {
    if (compareMusnisAll.length < 2) return null
    return Object.entries(TIPOS_RIESGO).map(([key, info]) => {
      const row = {
        subject: info.label.replace('Riesgo ', '').replace(' Compuesto', ' Comp.'),
        fullMark: 5,
      }
      compareMusnisAll.forEach((m, i) => {
        row[`v${i}`] = Number(m[info.field] || 0)
        row[`name${i}`] = m.municipio
      })
      return row
    })
  }, [compareMusnisAll])

  const tabInfo = TIPOS_RIESGO[tabActivo]
  const tabIdx = municipio ? Number(municipio[tabInfo?.field] || 0) : 0
  const tabNivel = municipio ? (municipio[tabInfo?.nivel] || 'Sin datos') : 'Sin datos'
  const tabColor = SCALE_ARRAYS[tabActivo]?.[2] ?? '#9c9483'
  const nivelColor = getNivelColor(tabActivo, tabNivel)

  // Datos de origen — conteos brutos + datos reales (no índices)
  const datosOrigenAmenaza = municipio ? [
    { label: 'Inundaciones',      valor: municipio.inundacion    ?? 0, key: 'inundacion' },
    { label: 'Deslizamientos',    valor: municipio.deslizamiento ?? 0, key: 'deslizamiento' },
    { label: 'Incendios',         valor: municipio.incendio      ?? 0, key: 'incendio' },
    { label: 'Sequías / Heladas', valor: municipio.sequia        ?? 0, key: 'sequia' },
    { label: 'Eventos Extremos',  valor: municipio.evento_extremo ?? 0, key: 'evento_extremo' },
  ] : []
  const maxEvento = Math.max(...datosOrigenAmenaza.map(d => d.valor), 1)

  return (
    <>
      {/* Modal tabla de datos */}
      {mostrarTabla && municipio && (
        <TablaDatosModal municipio={municipio} onClose={() => setMostrarTabla(false)} />
      )}

      <div className={`ficha-panel${isOpen ? ' open' : ''}`}>
        {municipio && (
          <>
            {/* Header */}
            <div className="ficha-header">
              <div className="ficha-header-top">
                <h2 className="ficha-municipio-nombre">
                  {municipio.municipio || 'Municipio'}
                </h2>
                <button className="ficha-close-btn" onClick={onClose} title="Cerrar">
                  <X size={14} />
                </button>
              </div>
              <div className="ficha-meta">
                <span className="ficha-dept-badge">
                  <MapPin size={10} strokeWidth={2} style={{ flexShrink: 0 }} /> {municipio.departamento || '—'}
                </span>
                {municipio.cod_municipio && (
                  <span className="ficha-cod-badge">
                    DIVIPOLA: {String(municipio.cod_municipio).padStart(5, '0')}
                  </span>
                )}
                {/* Botón comparar */}
                <button
                  onClick={() => onToggleComparar && onToggleComparar(municipio)}
                  title={isInComparar ? 'Quitar de comparación' : canAddComparar ? 'Añadir a comparación (máx. 3)' : 'Ya hay 3 municipios en comparación'}
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 8px',
                    background: isInComparar ? `${SELECTED_INDICATOR}26` : 'var(--bg-elevated)',
                    border: `1px solid ${isInComparar ? SELECTED_INDICATOR : 'var(--border)'}`,
                    borderRadius: 12,
                    color: isInComparar ? SELECTED_INDICATOR : canAddComparar ? 'var(--text-secondary)' : 'var(--text-disabled)',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: canAddComparar || isInComparar ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: 'var(--font-sans)',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {isInComparar
                    ? <><Check size={10} strokeWidth={2.5} /> Comparando</>
                    : '+ Comparar'}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="ficha-tabs">
              {Object.entries(TIPOS_RIESGO).map(([key, info]) => {
                const Icon = ICON_MAP[info.icon]
                const isActive = tabActivo === key
                return (
                  <button
                    key={key}
                    className={`ficha-tab${isActive ? ' active' : ''}`}
                    onClick={() => setTabActivo(key)}
                    style={isActive ? { color: SCALE_ARRAYS[key]?.[3] } : {}}
                  >
                    <span
                      className="ficha-tab-dot"
                      style={{ background: SCALE_ARRAYS[key]?.[2], opacity: isActive ? 1 : 0.4 }}
                    />
                    {Icon && <Icon size={11} />}
                    <span>{info.label.replace('Riesgo ', '').replace(' Compuesto', ' Comp.')}</span>
                  </button>
                )
              })}
            </div>

            {/* Contenido */}
            <div className="ficha-content">

              {/* Métricas principales */}
              <div>
                <div className="section-title">Métricas</div>
                <div className="metrics-grid">
                  {/* Índice */}
                  <div className="metric-card" style={{ '--card-accent': tabColor }}>
                    <div className="metric-card-label">Índice {tabInfo?.label.replace('Riesgo ', '')}</div>
                    <div className="metric-card-value colored" style={{ '--value-color': tabColor }}>
                      {tabIdx > 0 ? tabIdx.toFixed(2) : '—'}
                    </div>
                    <div className="metric-card-sub">escala 0 – 5</div>
                  </div>

                  {/* Total eventos */}
                  <div className="metric-card" style={{ '--card-accent': 'var(--border-strong)' }}>
                    <div className="metric-card-label">Total Eventos</div>
                    <div className="metric-card-value colored" style={{ '--value-color': SCALE_ARRAYS[tabActivo]?.[2] ?? 'var(--border-strong)' }}>
                      {municipio.total_eventos > 0
                        ? municipio.total_eventos.toLocaleString()
                        : '—'}
                    </div>
                    <div className="metric-card-sub">2019 – 2026</div>
                  </div>

                  {/* Nivel */}
                  <div className="metric-card" style={{ '--card-accent': nivelColor }}>
                    <div className="metric-card-label">Nivel de Riesgo</div>
                    <div style={{ marginTop: 6 }}>
                      <span
                        className="nivel-badge"
                        style={{
                          background: getNivelBg(tabActivo, tabNivel),
                          color: getNivelTextColor(tabActivo, tabNivel),
                          border: `1px solid ${nivelColor}44`,
                        }}
                      >
                        <span className="nivel-badge-dot" style={{ background: nivelColor }} />
                        {tabNivel}
                      </span>
                    </div>
                  </div>

                  {/* Ranking dpto */}
                  <div className="metric-card" style={{ '--card-accent': 'var(--border-strong)' }}>
                    <div className="metric-card-label">Ranking Dpto.</div>
                    {rankingDept ? (
                      <>
                        <div className="metric-card-value colored" style={{ '--value-color': 'var(--border-strong)' }}>
                          #{rankingDept.rank}
                        </div>
                        <div className="metric-card-sub">de {rankingDept.total} munic.</div>
                      </>
                    ) : (
                      <div className="metric-card-value">—</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Radar de riesgos */}
              {radarData.some(d => d.value > 0) && (
                <div>
                  <div className="section-title">Perfil de Riesgos</div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" gridType="circle" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Bricolage Grotesque, system-ui, sans-serif' }}
                          stroke="rgba(255,255,255,0.1)"
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 5]}
                          tick={{ fill: 'var(--text-disabled)', fontSize: 8 }}
                          stroke="rgba(255,255,255,0.05)"
                          tickCount={4}
                        />
                        <Radar
                          name="Índice"
                          dataKey="value"
                          stroke={SCALE_ARRAYS[tabActivo]?.[2]}
                          fill={SCALE_ARRAYS[tabActivo]?.[1]}
                          fillOpacity={0.2}
                          strokeWidth={1.5}
                          dot={{ fill: SCALE_ARRAYS[tabActivo]?.[3], r: 3, strokeWidth: 0 }}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Radar multi-municipio (comparación) */}
              {multiRadarData && (
                <div>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Comparación de Perfiles</span>
                    <button
                      onClick={() => onClearComparar && onClearComparar()}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-sans)',
                        padding: 0,
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {compareMusnisAll.map((m, i) => (
                      <span key={m.cod_municipio} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, color: COMPARE_COLORS[i] }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COMPARE_COLORS[i], flexShrink: 0, display: 'inline-block' }} />
                        {m.municipio}
                      </span>
                    ))}
                  </div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={230}>
                      <RadarChart data={multiRadarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" gridType="circle" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Bricolage Grotesque, system-ui, sans-serif' }}
                          stroke="rgba(255,255,255,0.1)"
                        />
                        <PolarRadiusAxis
                          angle={30} domain={[0, 5]}
                          tick={{ fill: 'var(--text-disabled)', fontSize: 8 }}
                          stroke="rgba(255,255,255,0.05)"
                          tickCount={4}
                        />
                        {compareMusnisAll.map((m, i) => (
                          <Radar
                            key={m.cod_municipio}
                            name={m.municipio}
                            dataKey={`v${i}`}
                            stroke={COMPARE_COLORS[i]}
                            fill={COMPARE_COLORS[i]}
                            fillOpacity={0.12}
                            strokeWidth={i === 0 ? 2 : 1.5}
                            dot={{ fill: COMPARE_COLORS[i], r: 2.5, strokeWidth: 0 }}
                          />
                        ))}
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: 'var(--text-muted)', paddingTop: 4 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Índices por Categoría — tab activo siempre primero y resaltado ── */}
              {barData.some(d => d.value > 0) && (
                <div>
                  <div className="section-title">Índices por Categoría</div>
                  <div className="hbar-list">
                    {barData.map((item) => (
                      <div
                        key={item.key}
                        className="hbar-item"
                        style={item.isActive ? {
                          background: 'var(--bg-elevated)',
                          borderRadius: 6,
                          border: `1px solid ${item.color}33`,
                          padding: '5px 7px',
                          margin: '0 -7px 6px',
                        } : { marginBottom: 6 }}
                      >
                        <div className="hbar-header">
                          <span
                            className="hbar-label"
                            style={item.isActive ? { color: item.color, fontWeight: 700 } : {}}
                          >
                            {item.isActive && (
                              <span style={{
                                display: 'inline-block', width: 5, height: 5,
                                borderRadius: '50%', background: item.color,
                                marginRight: 5, verticalAlign: 'middle',
                              }} />
                            )}
                            {item.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              className="hbar-value"
                              style={item.isActive ? { color: item.color, fontWeight: 700 } : {}}
                            >
                              {item.value > 0 ? item.value.toFixed(2) : '—'}
                            </span>
                            {item.nivel && item.nivel !== 'Sin datos' && (
                              <span style={{
                                fontSize: 9, padding: '1px 6px',
                                borderRadius: 8,
                                background: item.isActive ? `${item.color}18` : 'var(--bg-elevated)',
                                border: `1px solid ${item.isActive ? item.color + '44' : 'var(--border)'}`,
                                color: item.isActive ? item.color : 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                              }}>
                                {item.nivel}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="hbar-track" style={{ opacity: item.isActive ? 1 : 0.55 }}>
                          <div
                            className="hbar-fill"
                            style={{
                              width: `${(item.value / 5) * 100}%`,
                              background: item.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Datos de Origen ── conteos brutos + variables reales ── */}
              <div>
                <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Datos de Origen</span>
                  <span style={{ fontSize: 9, color: 'var(--text-disabled)', fontWeight: 400 }}>UNGRD 2019–2026</span>
                </div>

                {/* Eventos brutos por categoría */}
                {datosOrigenAmenaza.some(d => d.valor > 0) ? (
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    marginBottom: 8,
                  }}>
                    {datosOrigenAmenaza.map((d, i) => {
                      const pct = (d.valor / maxEvento) * 100
                      const color = SCALE_ARRAYS[d.key]?.[3] ?? '#9c9483'
                      const isTabKey = d.key === tabActivo
                      return (
                        <div
                          key={d.key}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '6px 12px',
                            borderBottom: i < datosOrigenAmenaza.length - 1 ? '1px solid var(--border)' : 'none',
                            background: isTabKey ? `${color}0d` : 'transparent',
                          }}
                        >
                          <span style={{
                            fontSize: 11, flex: 1,
                            color: isTabKey ? color : 'var(--text-secondary)',
                            fontWeight: isTabKey ? 600 : 400,
                          }}>
                            {d.label}
                          </span>
                          {/* Mini barra proporcional */}
                          <div style={{ width: 64, background: 'var(--bg-surface)', borderRadius: 3, height: 4, flexShrink: 0 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, opacity: isTabKey ? 1 : 0.5 }} />
                          </div>
                          <span style={{
                            fontSize: 12, fontWeight: 700, minWidth: 28, textAlign: 'right',
                            color: isTabKey ? color : 'var(--text-primary)',
                          }}>
                            {d.valor}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-disabled)', minWidth: 36 }}>eventos</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 12px', fontSize: 11, color: 'var(--text-disabled)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 8, marginBottom: 8,
                  }}>
                    Sin eventos UNGRD registrados para este municipio.
                  </div>
                )}

                {/* IPM desagregado + temperatura real */}
                {(municipio.ipm_total != null || municipio.temp_media_anual != null) && (
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}>
                    {municipio.ipm_total != null && (
                      <div style={{ padding: '8px 12px', borderBottom: municipio.temp_media_anual != null ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={11} style={{ color: '#bd7341', flexShrink: 0 }} />
                            IPM — Pobreza Multidimensional
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#bd7341' }}>
                            {Number(municipio.ipm_total).toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', borderRadius: 3, height: 4, marginBottom: 4 }}>
                          <div style={{ width: `${Math.min(100, Number(municipio.ipm_total))}%`, height: '100%', background: '#bd7341', borderRadius: 3 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
                          {municipio.ipm_cabecera != null && (
                            <span>Cabecera: <strong style={{ color: 'var(--text-secondary)' }}>{Number(municipio.ipm_cabecera).toFixed(1)}%</strong></span>
                          )}
                          {municipio.ipm_rural != null && (
                            <span>Rural: <strong style={{ color: 'var(--text-secondary)' }}>{Number(municipio.ipm_rural).toFixed(1)}%</strong></span>
                          )}
                          <span style={{ marginLeft: 'auto', color: 'var(--text-disabled)' }}>DANE Censo 2018</span>
                        </div>
                      </div>
                    )}
                    {municipio.temp_media_anual != null && (
                      <div style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Thermometer size={11} style={{ color: '#c07040', flexShrink: 0 }} />
                            Temperatura Media Anual
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#c07040' }}>
                            {Number(municipio.temp_media_anual).toFixed(1)} °C
                          </span>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', borderRadius: 3, height: 4, marginBottom: 4 }}>
                          <div style={{
                            width: `${Math.min(100, Math.max(0, (Number(municipio.temp_media_anual) - 6) / 24 * 100))}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #f5d4a0, #7a3020)',
                            borderRadius: 3,
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-disabled)' }}>
                          <span>6 °C (mín. Colombia)</span><span>IDEAM</span><span>30 °C (máx. Colombia)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Serie temporal */}
              {serieTemporal.length > 0 && (
                <div>
                  <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Eventos por Año</span>
                    {deptAvgAnual !== null && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                        — — prom. depto.: {deptAvgAnual.toFixed(1)}/año
                      </span>
                    )}
                  </div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={serieTemporal} margin={{ top: 6, right: 12, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                        <XAxis dataKey="año" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" allowDecimals={false} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        {deptAvgAnual !== null && (
                          <ReferenceLine
                            y={deptAvgAnual}
                            stroke="rgba(255,255,255,0.30)"
                            strokeDasharray="5 4"
                            strokeWidth={1.2}
                            label={{
                              value: `Prom. ${municipio?.departamento?.split(' ')[0] ?? 'Depto.'}`,
                              fill: 'rgba(255,255,255,0.4)',
                              fontSize: 9,
                              position: 'insideTopRight',
                            }}
                          />
                        )}
                        <Line type="monotone" dataKey="inundacion" stroke={SERIE_COLORS.inundacion} strokeWidth={1.5} dot={false} name="Inundación" />
                        <Line type="monotone" dataKey="deslizamiento" stroke={SERIE_COLORS.deslizamiento} strokeWidth={1.5} dot={false} name="Deslizamiento" />
                        <Line type="monotone" dataKey="incendio" stroke={SERIE_COLORS.incendio} strokeWidth={1.5} dot={false} name="Incendio" />
                        <Line type="monotone" dataKey="sequia" stroke={SERIE_COLORS.sequia} strokeWidth={1.5} dot={false} name="Sequía" />
                        <Line type="monotone" dataKey="evento_extremo" stroke={SERIE_COLORS.evento_extremo} strokeWidth={1.5} dot={false} name="Ev. Extremo" />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 9, color: 'var(--text-muted)', paddingTop: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="ficha-footer">
              <span className="ficha-footer-icon"><BarChart2 size={12} strokeWidth={1.5} /></span>
              <span className="ficha-footer-text">UNGRD · DANE · IDEAM</span>
              <span className="ficha-footer-dot" />
              <span className="ficha-footer-text">Datos 2018 – 2026</span>
              <span className="ficha-footer-dot" />
              <button
                onClick={() => setMostrarTabla(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 10,
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '0 2px',
                  fontFamily: 'var(--font-sans)',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Table2 size={11} strokeWidth={1.5} />
                Ver datos
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
