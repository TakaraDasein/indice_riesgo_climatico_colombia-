import { useState, useMemo } from 'react'
import {
  Zap, Waves, Mountain, Flame, Sun, Wind, Triangle, Users, Thermometer,
  ChevronDown, ChevronUp, MapPin, BarChart2, Globe, Building2, Map,
} from 'lucide-react'
import {
  TIPOS_RIESGO, NIVEL_COLORS_BY_RIESGO, SCALE_ARRAYS,
  NIVELES_ORDEN,
} from '../utils/riesgoColors'

const ICON_MAP = { Zap, Waves, Mountain, Flame, Sun, Wind, Triangle, Users, Thermometer }

const MAP_MODES = [
  { id: 'calor',         Icon: Thermometer, label: 'Calor' },
  { id: 'municipios',    Icon: Building2,   label: 'Municipios' },
  { id: 'departamentos', Icon: Map,         label: 'Deptos.' },
]

export default function Sidebar({
  riesgoActivo,
  onRiesgoChange,
  mapMode,
  onMapModeChange,
  filtros,
  onFiltrosChange,
  stats,
  geojson,
  departamentos,
  departamentoFiltro,
  onDepartamentoChange,
  municipioSeleccionado,
  onSelectMunicipio,
  collapsed,
  onToggleCollapse,
  onOpenDoc,
}) {
  const [filtrosOpen, setFiltrosOpen] = useState(false)

  // Distribución de niveles con porcentajes
  const nivelDist = useMemo(() => {
    if (!stats?.niveles_riesgo) return []
    const total = Object.values(stats.niveles_riesgo).reduce((a, b) => a + b, 0) || 1
    return NIVELES_ORDEN.map(nivel => ({
      nivel,
      count: stats.niveles_riesgo[nivel] || 0,
      pct: ((stats.niveles_riesgo[nivel] || 0) / total) * 100,
      color: NIVEL_COLORS_BY_RIESGO[riesgoActivo]?.[nivel] || '#4a4a4a',
    }))
  }, [stats])

  // Top 10 dinámico según riesgoActivo (calculado desde geojson)
  const topMunicipios = useMemo(() => {
    const tipoInfo = TIPOS_RIESGO[riesgoActivo]
    // Si hay geojson, computar desde los features
    if (geojson?.features && tipoInfo?.field) {
      return geojson.features
        .map(f => f.properties || {})
        .filter(p => {
          const v = Number(p[tipoInfo.field])
          return !isNaN(v) && v > 0
        })
        .sort((a, b) => Number(b[tipoInfo.field]) - Number(a[tipoInfo.field]))
        .slice(0, 10)
        .map(p => ({
          cod: p.cod_municipio,
          nombre: p.municipio,
          departamento: p.departamento,
          valor: Number(p[tipoInfo.field]),
          nivel: p[tipoInfo.nivel] || 'Sin datos',
          total_eventos: p.total_eventos,
        }))
    }
    // Fallback: stats.json (solo tiene riesgo_compuesto)
    if (!stats?.top_municipios) return []
    return stats.top_municipios.slice(0, 10)
  }, [geojson, riesgoActivo, stats])

  const munisSinDatos = useMemo(() => {
    if (!stats) return 0
    return (stats.niveles_riesgo?.['Sin datos'] || 0)
  }, [stats])

  const muniConDatos = (stats?.total_municipios || 0) - munisSinDatos

  // Toggle nivel en filtros
  const toggleNivel = (nivel) => {
    const current = filtros.niveles || []
    const next = current.includes(nivel)
      ? current.filter(n => n !== nivel)
      : [...current, nivel]
    onFiltrosChange({ ...filtros, niveles: next })
  }

  if (collapsed) {
    return (
      <div className="sidebar collapsed">
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title="Expandir panel"
          style={{ right: '-14px' }}
        >
          ▶
        </button>
        {/* Iconos verticales */}
        <div style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          {Object.entries(TIPOS_RIESGO).map(([key, info]) => {
            const Icon = ICON_MAP[info.icon]
            return (
              <button
                key={key}
                onClick={() => onRiesgoChange(key)}
                style={{
                  width: 36, height: 36,
                  background: riesgoActivo === key ? `${SCALE_ARRAYS[key]?.[2] ?? '#9c9483'}22` : 'var(--bg-elevated)',
                  border: `1px solid ${riesgoActivo === key ? (SCALE_ARRAYS[key]?.[3] ?? '#6b6050') : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={info.label}
              >
                {Icon && <Icon size={16} color={riesgoActivo === key ? (SCALE_ARRAYS[key]?.[3] ?? '#9c9483') : 'var(--text-muted)'} />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar">
      {/* Toggle */}
      <button
        className="sidebar-toggle"
        onClick={onToggleCollapse}
        title="Colapsar panel"
      >
        ◀
      </button>

      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Globe size={18} strokeWidth={1.5} /></div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">Riesgos Climáticos</span>
            <span className="sidebar-logo-sub">Colombia · UNGRD</span>
          </div>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="sidebar-content">

        {/* Tipo de Riesgo */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Tipo de Riesgo</div>
          <div className="risk-tabs-grid">
            {Object.entries(TIPOS_RIESGO).map(([key, info]) => {
              const Icon = ICON_MAP[info.icon]
              const isActive = riesgoActivo === key
              return (
                <button
                  key={key}
                  className={`risk-tab${isActive ? ' active' : ''}`}
                  style={{ '--tab-color': SCALE_ARRAYS[key]?.[3] ?? '#6b6050' }}
                  onClick={() => onRiesgoChange(key)}
                  title={info.description}
                >
                  <div
                    className="risk-tab-icon"
                    style={{
                      background: isActive ? `${SCALE_ARRAYS[key]?.[2] ?? '#9c9483'}22` : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    {Icon && (
                      <Icon
                        size={16}
                        color={isActive ? (SCALE_ARRAYS[key]?.[3] ?? '#9c9483') : 'var(--text-muted)'}
                      />
                    )}
                  </div>
                  <span
                    className="risk-tab-label"
                    style={{ color: isActive ? (SCALE_ARRAYS[key]?.[3] ?? undefined) : undefined }}
                  >
                    {info.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Departamento */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Departamento</div>
          <select
            className="sidebar-select"
            value={departamentoFiltro}
            onChange={e => onDepartamentoChange(e.target.value)}
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Modo de mapa */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Modo de Mapa</div>
          <div className="map-mode-buttons">
            {MAP_MODES.map(mode => (
              <button
                key={mode.id}
                className={`map-mode-btn${mapMode === mode.id ? ' active' : ''}`}
                onClick={() => onMapModeChange(mode.id)}
              >
                <mode.Icon size={13} strokeWidth={1.5} />
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtros avanzados colapsables */}
        <div>
          <div
            className="collapsible-header"
            onClick={() => setFiltrosOpen(o => !o)}
          >
            <span className="collapsible-header-text">Filtros Avanzados</span>
            <span className={`collapsible-arrow${filtrosOpen ? ' open' : ''}`}>
              <ChevronDown size={14} />
            </span>
          </div>
          {filtrosOpen && (
            <div className="collapsible-body">
              {/* Rango de índice */}
              <div>
                <div className="filter-label">
                  Rango de Índice
                  <span>{(filtros.rango?.[0] ?? 0).toFixed(1)} – {(filtros.rango?.[1] ?? 5).toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Mínimo: {(filtros.rango?.[0] ?? 0).toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0" max="5" step="0.1"
                      value={filtros.rango?.[0] ?? 0}
                      onChange={e => onFiltrosChange({
                        ...filtros,
                        rango: [Number(e.target.value), Math.max(Number(e.target.value), filtros.rango?.[1] ?? 5)],
                      })}
                      style={{
                        width: '100%', accentColor: 'var(--text-primary)',
                        height: 4, cursor: 'pointer',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Máximo: {(filtros.rango?.[1] ?? 5).toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0" max="5" step="0.1"
                      value={filtros.rango?.[1] ?? 5}
                      onChange={e => onFiltrosChange({
                        ...filtros,
                        rango: [Math.min(filtros.rango?.[0] ?? 0, Number(e.target.value)), Number(e.target.value)],
                      })}
                      style={{
                        width: '100%', accentColor: 'var(--text-primary)',
                        height: 4, cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes de nivel */}
              <div>
                <div className="filter-label">Filtrar por Nivel</div>
                <div className="nivel-checkboxes">
                  {['Bajo', 'Medio', 'Alto', 'Muy Alto'].map(nivel => (
                    <label key={nivel} className="nivel-checkbox">
                      <input
                        type="checkbox"
                        checked={!filtros.niveles || filtros.niveles.length === 0 || filtros.niveles.includes(nivel)}
                        onChange={() => toggleNivel(nivel)}
                        style={{ '--check-color': NIVEL_COLORS_BY_RIESGO[riesgoActivo]?.[nivel] ?? '#4a4a4a' }}
                      />
                      <span
                        className="nivel-checkbox-dot"
                        style={{ background: NIVEL_COLORS_BY_RIESGO[riesgoActivo]?.[nivel] ?? '#4a4a4a' }}
                      />
                      <span className="nivel-checkbox-label">{nivel}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Botón reset filtros */}
              <button
                onClick={() => onFiltrosChange({ rango: [0, 5], niveles: [] })}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Stats resumen */}
        {stats && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Estadísticas</div>
            <div className="stats-grid">
              <div className="stat-mini-card">
                <div className="stat-mini-value">{(stats.total_municipios || 0).toLocaleString()}</div>
                <div className="stat-mini-label">Total munic.</div>
              </div>
              <div className="stat-mini-card">
                <div className="stat-mini-value" style={{ color: 'var(--text-primary)' }}>
                  {muniConDatos.toLocaleString()}
                </div>
                <div className="stat-mini-label">Con datos</div>
              </div>
            </div>

            {/* Distribución de niveles */}
            <div className="nivel-distribution">
              {nivelDist.filter(n => n.nivel !== 'Sin datos').map(({ nivel, count, pct, color }) => (
                <div key={nivel} className="nivel-dist-row">
                  <span className="nivel-dist-label">{nivel}</span>
                  <div className="nivel-dist-bar-track">
                    <div
                      className="nivel-dist-bar-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <span className="nivel-dist-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 10 municipios */}
        {topMunicipios.length > 0 && (
          <div className="sidebar-section" style={{ borderBottom: 'none' }}>
            <div className="sidebar-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Top Municipios</span>
              <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                {TIPOS_RIESGO[riesgoActivo]?.label}
              </span>
            </div>
            <div className="top-municipios-list">
              {topMunicipios.map((muni, i) => {
                  const nivelColor = NIVEL_COLORS_BY_RIESGO[riesgoActivo]?.[muni.nivel] || '#4a4a4a'
                const isSelected = municipioSeleccionado &&
                  String(municipioSeleccionado.cod_municipio) === String(muni.cod || muni.cod_municipio)
                // Valor a mostrar: índice si disponible, sino eventos
                const displayVal = muni.valor != null
                  ? muni.valor.toFixed(2)
                  : (muni.total_eventos ?? '—')

                return (
                  <div
                    key={muni.cod || muni.cod_municipio || i}
                    className={`top-municipio-item${isSelected ? ' selected' : ''}`}
                    onClick={() => onSelectMunicipio({
                      ...muni,
                      cod_municipio: muni.cod || muni.cod_municipio,
                    })}
                  >
                    <span className="top-muni-rank">{i + 1}</span>
                    <div className="top-muni-info">
                      <div className="top-muni-nombre">{muni.nombre}</div>
                      <div className="top-muni-dept">{muni.departamento}</div>
                    </div>
                    <span
                      className="top-muni-badge"
                      style={{
                        background: `${nivelColor}22`,
                        color: nivelColor,
                        border: `1px solid ${nivelColor}44`,
                      }}
                    >
                      {displayVal}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Botón documentación / bibliografía */}
            {onOpenDoc && (
              <button
                onClick={onOpenDoc}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '7px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--selected-indicator)'; e.currentTarget.style.color = 'var(--selected-indicator)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Triangle size={13} strokeWidth={1.5} />
                Metodología e Índices
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
