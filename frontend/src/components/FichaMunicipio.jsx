import { useState, useMemo, useEffect } from 'react'
import {
  Zap, Waves, Mountain, Flame, Sun, Wind, X,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import {
  TIPOS_RIESGO, NIVEL_COLORS, NIVEL_BG, NIVEL_TEXT_COLORS,
} from '../utils/riesgoColors'

const ICON_MAP = { Zap, Waves, Mountain, Flame, Sun, Wind }

// Tooltip personalizado para Recharts
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

export default function FichaMunicipio({
  municipio,
  onClose,
  riesgoActivo,
  geojson,
}) {
  const [tabActivo, setTabActivo] = useState('riesgo_compuesto')
  const [serieTemporal, setSerieTemporal] = useState([])
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

  // Datos para BarChart horizontal (todos los riesgos)
  const barData = useMemo(() => {
    if (!municipio) return []
    return Object.entries(TIPOS_RIESGO)
      .filter(([k]) => k !== 'riesgo_compuesto')
      .map(([key, info]) => ({
        name: info.label,
        value: Number(municipio[info.field] || 0),
        color: info.color,
        nivel: municipio[info.nivel] || 'Sin datos',
      }))
      .sort((a, b) => b.value - a.value)
  }, [municipio])

  // Indicadores detallados del tab activo
  const tabInfo = TIPOS_RIESGO[tabActivo]
  const tabIdx = municipio ? Number(municipio[tabInfo?.field] || 0) : 0
  const tabNivel = municipio ? (municipio[tabInfo?.nivel] || 'Sin datos') : 'Sin datos'
  const tabColor = tabInfo?.color || 'var(--accent-blue)'
  const nivelColor = NIVEL_COLORS[tabNivel] || NIVEL_COLORS['Sin datos']

  return (
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
                📍 {municipio.departamento || '—'}
              </span>
              {municipio.cod_municipio && (
                <span className="ficha-cod-badge">
                  DIVIPOLA: {String(municipio.cod_municipio).padStart(5, '0')}
                </span>
              )}
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
                  style={isActive ? { color: info.color } : {}}
                >
                  <span
                    className="ficha-tab-dot"
                    style={{ background: info.color, opacity: isActive ? 1 : 0.4 }}
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
                <div
                  className="metric-card"
                  style={{ '--card-accent': tabColor }}
                >
                  <div className="metric-card-label">Índice {tabInfo?.label.replace('Riesgo ', '')}</div>
                  <div
                    className="metric-card-value colored"
                    style={{ '--value-color': tabColor }}
                  >
                    {tabIdx > 0 ? tabIdx.toFixed(2) : '—'}
                  </div>
                  <div className="metric-card-sub">escala 0 – 5</div>
                </div>

                {/* Total eventos */}
                <div
                  className="metric-card"
                  style={{ '--card-accent': 'var(--accent-cyan)' }}
                >
                  <div className="metric-card-label">Total Eventos</div>
                  <div className="metric-card-value colored" style={{ '--value-color': 'var(--accent-cyan)' }}>
                    {municipio.total_eventos > 0
                      ? municipio.total_eventos.toLocaleString()
                      : '—'}
                  </div>
                  <div className="metric-card-sub">2019 – 2026</div>
                </div>

                {/* Nivel */}
                <div
                  className="metric-card"
                  style={{ '--card-accent': nivelColor }}
                >
                  <div className="metric-card-label">Nivel de Riesgo</div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      className="nivel-badge"
                      style={{
                        background: NIVEL_BG[tabNivel],
                        color: NIVEL_TEXT_COLORS[tabNivel] || nivelColor,
                        border: `1px solid ${nivelColor}44`,
                      }}
                    >
                      <span className="nivel-badge-dot" style={{ background: nivelColor }} />
                      {tabNivel}
                    </span>
                  </div>
                </div>

                {/* Ranking dpto */}
                <div
                  className="metric-card"
                  style={{ '--card-accent': 'var(--accent-purple)' }}
                >
                  <div className="metric-card-label">Ranking Dpto.</div>
                  {rankingDept ? (
                    <>
                      <div className="metric-card-value colored" style={{ '--value-color': 'var(--accent-purple)' }}>
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
                      <PolarGrid
                        stroke="rgba(255,255,255,0.08)"
                        gridType="circle"
                      />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter, sans-serif' }}
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
                        stroke="var(--accent-cyan)"
                        fill={tabColor}
                        fillOpacity={0.2}
                        strokeWidth={1.5}
                        dot={{ fill: 'var(--accent-cyan)', r: 3, strokeWidth: 0 }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Barras horizontales */}
            {barData.some(d => d.value > 0) && (
              <div>
                <div className="section-title">Índices por Categoría</div>
                <div className="hbar-list">
                  {barData.map((item, i) => (
                    <div key={i} className="hbar-item">
                      <div className="hbar-header">
                        <span className="hbar-label">{item.name}</span>
                        <span className="hbar-value">{item.value.toFixed(2)}</span>
                      </div>
                      <div className="hbar-track">
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

            {/* Indicadores detallados */}
            <div>
              <div className="section-title">Indicadores Detallados</div>
              <div className="indicadores-list">
                {Object.entries(TIPOS_RIESGO).map(([key, info]) => {
                  const Icon = ICON_MAP[info.icon]
                  const idx = Number(municipio[info.field] || 0)
                  const nivel = municipio[info.nivel] || 'Sin datos'
                  const nColor = NIVEL_COLORS[nivel] || NIVEL_COLORS['Sin datos']
                  const nTextColor = NIVEL_TEXT_COLORS[nivel] || NIVEL_TEXT_COLORS['Sin datos']
                  const pct = Math.min(100, (idx / 5) * 100)

                  return (
                    <div key={key} className="indicador-item">
                      <div className="indicador-header">
                        <div
                          className="indicador-label"
                          style={{ color: info.color }}
                        >
                          {Icon && <Icon size={13} />}
                          {info.label}
                        </div>
                        <div className="indicador-right">
                          <span className="indicador-idx">{idx > 0 ? idx.toFixed(2) : '—'}</span>
                          <span
                            className="indicador-nivel-text"
                            style={{
                              background: NIVEL_BG[nivel],
                              color: nTextColor,
                              border: `1px solid ${nColor}44`,
                            }}
                          >
                            {nivel}
                          </span>
                        </div>
                      </div>
                      <div className="indicador-progress-track">
                        <div
                          className="indicador-progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${info.color}aa, ${info.color})`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Datos extra si existen */}
            {(municipio.area_km2 || municipio.poblacion) && (
              <div>
                <div className="section-title">Datos Básicos</div>
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {municipio.area_km2 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Área</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {Number(municipio.area_km2).toLocaleString()} km²
                      </span>
                    </div>
                  )}
                  {municipio.poblacion && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Población</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {Number(municipio.poblacion).toLocaleString()} hab.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Serie temporal */}
            {serieTemporal.length > 0 && (
              <div>
                <div className="section-title">Eventos por Año</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={serieTemporal} margin={{ top: 6, right: 12, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="año"
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                        stroke="rgba(255,255,255,0.1)"
                      />
                      <YAxis
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                        stroke="rgba(255,255,255,0.1)"
                        allowDecimals={false}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="inundacion" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Inundación" />
                      <Line type="monotone" dataKey="deslizamiento" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Deslizamiento" />
                      <Line type="monotone" dataKey="incendio" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Incendio" />
                      <Line type="monotone" dataKey="sequia" stroke="#eab308" strokeWidth={1.5} dot={false} name="Sequía" />
                      <Line type="monotone" dataKey="evento_extremo" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Ev. Extremo" />
                      <Legend
                        iconSize={8}
                        wrapperStyle={{ fontSize: 9, color: 'var(--text-muted)', paddingTop: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="ficha-footer">
            <span className="ficha-footer-icon">📊</span>
            <span className="ficha-footer-text">Fuente: UNGRD</span>
            <span className="ficha-footer-dot" />
            <span className="ficha-footer-text">Datos 2019 – 2026</span>
            <span className="ficha-footer-dot" />
            <span className="ficha-footer-text">Colombia</span>
          </div>
        </>
      )}
    </div>
  )
}
