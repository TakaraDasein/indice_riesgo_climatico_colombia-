/**
 * PanelInferior — Panel analítico inferior con tabs:
 *   [Scatter] [Box Plot] [Correlación]
 *
 * Props:
 *   geojson               – FeatureCollection
 *   riesgoActivo          – string (clave TIPOS_RIESGO)
 *   departamentoFiltro    – string
 *   municipioSeleccionado – object | null
 *   onSelectMunicipio     – (props) => void
 */
import { useState, useMemo, useCallback } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { TIPOS_RIESGO, NIVEL_COLORS } from '../utils/riesgoColors'
import { ChevronDown, ChevronUp } from 'lucide-react'

// ─── Campos disponibles para scatter / correlación ──────────────
const CAMPOS = [
  { key: 'idx_riesgo_compuesto', label: 'Riesgo Compuesto', color: '#8b5cf6' },
  { key: 'idx_triangulado',      label: 'Índice Triangulado', color: '#e879f9' },
  { key: 'idx_inundacion',       label: 'Inundación',         color: '#3b82f6' },
  { key: 'idx_deslizamiento',    label: 'Deslizamiento',      color: '#a78bfa' },
  { key: 'idx_incendio',         label: 'Incendio',           color: '#f97316' },
  { key: 'idx_sequia',           label: 'Sequía',             color: '#fbbf24' },
  { key: 'idx_evento_extremo',   label: 'Vientos/Temporal',   color: '#10b981' },
  { key: 'idx_ipm',              label: 'Pobreza Multidim.',  color: '#f59e0b' },
  { key: 'idx_temperatura',      label: 'Estrés Térmico',     color: '#ef4444' },
  { key: 'ipm_total',            label: 'IPM % Total',        color: '#fb923c' },
  { key: 'temp_media_anual',     label: 'Temp. Media (°C)',   color: '#f87171' },
  { key: 'total_eventos',        label: 'Total Eventos',      color: '#22d3ee' },
]

const campoByKey = Object.fromEntries(CAMPOS.map(c => [c.key, c]))

// ─── Tooltip personalizado scatter ──────────────────────────────
function ScatterTooltipContent({ active, payload }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
      fontFamily: 'var(--font-sans)',
      pointerEvents: 'none',
    }}>
      <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
        {d.municipio}
      </p>
      <p style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{d.departamento}</p>
      <p style={{ color: '#22d3ee' }}>
        X: <strong>{typeof d.x === 'number' ? d.x.toFixed(3) : d.x}</strong>
      </p>
      <p style={{ color: '#f59e0b' }}>
        Y: <strong>{typeof d.y === 'number' ? d.y.toFixed(3) : d.y}</strong>
      </p>
    </div>
  )
}

// ─── Componente Scatter ──────────────────────────────────────────
function TabScatter({ datos, municipioSeleccionado, onSelectMunicipio, departamentoFiltro }) {
  const [xKey, setXKey] = useState('idx_riesgo_compuesto')
  const [yKey, setYKey] = useState('idx_ipm')

  const puntos = useMemo(() => {
    if (!datos) return []
    return datos
      .filter(d => {
        const x = Number(d[xKey])
        const y = Number(d[yKey])
        return !isNaN(x) && !isNaN(y) && x > 0 && y > 0
      })
      .map(d => ({
        x: Number(d[xKey]),
        y: Number(d[yKey]),
        municipio: d.municipio,
        departamento: d.departamento,
        cod_municipio: d.cod_municipio,
        nivel: d.nivel_riesgo_compuesto || 'Sin datos',
      }))
  }, [datos, xKey, yKey])

  const selCod = municipioSeleccionado?.cod_municipio

  const selectStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 11,
    padding: '4px 8px',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Selectores ejes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Eje X:</span>
        <select value={xKey} onChange={e => setXKey(e.target.value)} style={selectStyle}>
          {CAMPOS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Eje Y:</span>
        <select value={yKey} onChange={e => setYKey(e.target.value)} style={selectStyle}>
          {CAMPOS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <span style={{ fontSize: 10, color: 'var(--text-disabled)', flexShrink: 0 }}>
          {puntos.length.toLocaleString()} municipios
        </span>
      </div>

      {/* Scatter chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 16, bottom: 20, left: -8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              name={campoByKey[xKey]?.label}
              tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
              stroke="rgba(255,255,255,0.1)"
              label={{ value: campoByKey[xKey]?.label, fill: 'var(--text-muted)', fontSize: 9, position: 'insideBottom', offset: -12 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              name={campoByKey[yKey]?.label}
              tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
              stroke="rgba(255,255,255,0.1)"
              label={{ value: campoByKey[yKey]?.label, fill: 'var(--text-muted)', fontSize: 9, angle: -90, position: 'insideLeft', offset: 14 }}
            />
            <RechartsTooltip content={<ScatterTooltipContent />} />
            <Scatter
              data={puntos}
              isAnimationActive={false}
            >
              {puntos.map((p, i) => {
                const isSel = selCod && String(p.cod_municipio) === String(selCod)
                return (
                  <Cell
                    key={i}
                    fill={isSel ? '#ffffff' : NIVEL_COLORS[p.nivel] || NIVEL_COLORS['Sin datos']}
                    opacity={isSel ? 1 : 0.6}
                    r={isSel ? 5 : 3}
                    cursor="pointer"
                    onClick={() => onSelectMunicipio && onSelectMunicipio(p)}
                  />
                )
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Componente Box Plot (manual usando barras) ──────────────────
function calcBoxStats(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const median = sorted[Math.floor(sorted.length * 0.5)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  const whiskerLow = Math.max(sorted[0], q1 - 1.5 * iqr)
  const whiskerHigh = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return { min: whiskerLow, q1, median, q3, max: whiskerHigh, mean, n: values.length }
}

function BoxRow({ label, stats, maxVal, color }) {
  if (!stats) return null
  const scale = v => `${(v / maxVal) * 100}%`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 90, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      {/* Caja */}
      <div style={{ flex: 1, position: 'relative', height: 18 }}>
        {/* Whisker line */}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: scale(stats.min), right: `${100 - (stats.max / maxVal) * 100}%`,
          height: 1, background: `${color}60`,
        }} />
        {/* Box Q1-Q3 */}
        <div style={{
          position: 'absolute', top: 2,
          left: scale(stats.q1),
          width: `${((stats.q3 - stats.q1) / maxVal) * 100}%`,
          height: 14,
          background: `${color}30`,
          border: `1px solid ${color}80`,
          borderRadius: 2,
        }} />
        {/* Mediana */}
        <div style={{
          position: 'absolute', top: 2,
          left: scale(stats.median),
          width: 2, height: 14,
          background: color,
          borderRadius: 1,
        }} />
      </div>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 28, textAlign: 'right', flexShrink: 0 }}>
        {stats.median.toFixed(2)}
      </span>
    </div>
  )
}

function TabBoxPlot({ datos }) {
  const [campo, setCampo] = useState('idx_riesgo_compuesto')

  const boxData = useMemo(() => {
    if (!datos) return []
    // Agrupar por departamento
    const byDept = {}
    datos.forEach(d => {
      const dept = d.departamento || 'Sin datos'
      if (!byDept[dept]) byDept[dept] = []
      const v = Number(d[campo])
      if (!isNaN(v) && v > 0) byDept[dept].push(v)
    })
    return Object.entries(byDept)
      .map(([dept, vals]) => ({ dept, stats: calcBoxStats(vals) }))
      .filter(d => d.stats)
      .sort((a, b) => (b.stats.median - a.stats.median))
  }, [datos, campo])

  const maxVal = useMemo(() => {
    return Math.max(...boxData.map(d => d.stats?.max || 0), 1)
  }, [boxData])

  const campoColor = campoByKey[campo]?.color || '#8b5cf6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Variable:</span>
        <select
          value={campo}
          onChange={e => setCampo(e.target.value)}
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text-primary)', fontSize: 11,
            padding: '4px 8px', fontFamily: 'var(--font-sans)', cursor: 'pointer',
          }}
        >
          {CAMPOS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <span style={{ fontSize: 10, color: 'var(--text-disabled)', marginLeft: 'auto' }}>
          Mediana por departamento · □ IQR · — whisker
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {boxData.map(({ dept, stats }) => (
          <BoxRow
            key={dept}
            label={dept}
            stats={stats}
            maxVal={maxVal}
            color={campoColor}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Componente Heatmap de correlación ──────────────────────────
function pearsonR(xs, ys) {
  const n = xs.length
  if (n < 3) return NaN
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  return num / (Math.sqrt(dx2) * Math.sqrt(dy2))
}

const HEATMAP_CAMPOS = CAMPOS.slice(0, 9)  // índices principales

function corColor(r) {
  if (isNaN(r)) return '#1e293b'
  // -1 → azul, 0 → gris, +1 → rojo
  if (r > 0) return `rgba(239,68,68,${Math.abs(r).toFixed(2)})`
  return `rgba(59,130,246,${Math.abs(r).toFixed(2)})`
}

function TabCorrelacion({ datos }) {
  const matrix = useMemo(() => {
    if (!datos || datos.length < 5) return null
    // Extraer vectores
    const vecs = {}
    HEATMAP_CAMPOS.forEach(c => {
      vecs[c.key] = datos
        .map(d => Number(d[c.key]))
        .filter(v => !isNaN(v) && v > 0)
    })

    const result = []
    for (const rowC of HEATMAP_CAMPOS) {
      const row = []
      for (const colC of HEATMAP_CAMPOS) {
        if (rowC.key === colC.key) { row.push(1); continue }
        // Pares con ambos valores válidos
        const pairs = datos
          .map(d => [Number(d[rowC.key]), Number(d[colC.key])])
          .filter(([a, b]) => !isNaN(a) && !isNaN(b) && a > 0 && b > 0)
        const r = pearsonR(pairs.map(p => p[0]), pairs.map(p => p[1]))
        row.push(r)
      }
      result.push(row)
    }
    return result
  }, [datos])

  if (!matrix) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 12 }}>
      Cargando datos...
    </div>
  )

  const CELL = 36
  const LABEL_W = 90
  const shortLabel = l => l.length > 10 ? l.slice(0, 9) + '.' : l

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
        Pearson r — azul: negativo · rojo: positivo
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 9 }}>
          <thead>
            <tr>
              <th style={{ width: LABEL_W, minWidth: LABEL_W }} />
              {HEATMAP_CAMPOS.map(c => (
                <th
                  key={c.key}
                  style={{
                    width: CELL, minWidth: CELL, padding: '2px 1px',
                    color: 'var(--text-muted)', fontWeight: 500,
                    writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                    height: 72, textAlign: 'left', verticalAlign: 'bottom',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {shortLabel(c.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_CAMPOS.map((rowC, ri) => (
              <tr key={rowC.key}>
                <td style={{
                  padding: '1px 6px 1px 0',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                  fontWeight: 500,
                }}>
                  {shortLabel(rowC.label)}
                </td>
                {matrix[ri].map((r, ci) => (
                  <td
                    key={ci}
                    title={`${rowC.label} × ${HEATMAP_CAMPOS[ci].label}: r=${isNaN(r) ? '—' : r.toFixed(3)}`}
                    style={{
                      width: CELL, height: CELL,
                      background: corColor(r),
                      textAlign: 'center',
                      color: Math.abs(r) > 0.5 ? 'white' : 'rgba(255,255,255,0.4)',
                      fontSize: 8,
                      cursor: 'default',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {isNaN(r) ? '—' : r.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Panel principal ─────────────────────────────────────────────
const TABS = [
  { id: 'scatter',    label: 'Scatter' },
  { id: 'boxplot',    label: 'Box Plot' },
  { id: 'correlacion', label: 'Correlación' },
]

export default function PanelInferior({
  geojson,
  riesgoActivo,
  departamentoFiltro,
  municipioSeleccionado,
  onSelectMunicipio,
}) {
  const [collapsed, setCollapsed] = useState(true)
  const [tab, setTab] = useState('scatter')

  // Extraer propiedades de features como array plano
  const datos = useMemo(() => {
    if (!geojson?.features) return []
    return geojson.features.map(f => f.properties || {})
  }, [geojson])

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        transition: 'height 0.25s ease',
        height: collapsed ? 36 : 320,
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        zIndex: 5,
      }}
    >
      {/* Barra de control */}
      <div
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
          paddingLeft: 8,
        }}
      >
        {/* Botón colapsar */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px 4px 6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            flexShrink: 0,
          }}
          title={collapsed ? 'Abrir panel de análisis' : 'Cerrar panel de análisis'}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Análisis
        </button>

        {/* Tabs — solo visible cuando está abierto */}
        {!collapsed && (
          <>
            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 8px', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: 2 }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '4px 12px',
                    background: tab === t.id ? 'var(--bg-elevated)' : 'none',
                    border: `1px solid ${tab === t.id ? 'var(--border)' : 'transparent'}`,
                    borderRadius: 6,
                    color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: tab === t.id ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Datos count */}
        {!collapsed && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-disabled)', paddingRight: 12 }}>
            {datos.length.toLocaleString()} municipios · {departamentoFiltro || 'Colombia'}
          </span>
        )}
      </div>

      {/* Contenido del tab */}
      {!collapsed && (
        <div style={{ height: 'calc(100% - 36px)', padding: '8px 12px', overflow: 'hidden' }}>
          {tab === 'scatter' && (
            <TabScatter
              datos={datos}
              municipioSeleccionado={municipioSeleccionado}
              onSelectMunicipio={onSelectMunicipio}
              departamentoFiltro={departamentoFiltro}
            />
          )}
          {tab === 'boxplot' && (
            <TabBoxPlot datos={datos} />
          )}
          {tab === 'correlacion' && (
            <TabCorrelacion datos={datos} />
          )}
        </div>
      )}
    </div>
  )
}
