import { useState, useMemo } from 'react'
import {
  Zap, Waves, Mountain, Flame, Sun, Wind,
  ChevronDown, ChevronUp, MapPin, BarChart2,
} from 'lucide-react'
import {
  TIPOS_RIESGO, NIVEL_COLORS, NIVEL_BG, NIVEL_TEXT_COLORS,
  NIVELES_ORDEN, nivelBadgeStyle,
} from '../utils/riesgoColors'

const ICON_MAP = { Zap, Waves, Mountain, Flame, Sun, Wind }

const MAP_MODES = [
  { id: 'calor',        emoji: '🌡️', label: 'Calor' },
  { id: 'municipios',   emoji: '🏘️', label: 'Municipios' },
  { id: 'departamentos',emoji: '🗺️', label: 'Deptos.' },
]

export default function Sidebar({
  riesgoActivo,
  onRiesgoChange,
  mapMode,
  onMapModeChange,
  filtros,
  onFiltrosChange,
  stats,
  departamentos,
  departamentoFiltro,
  onDepartamentoChange,
  municipioSeleccionado,
  onSelectMunicipio,
  collapsed,
  onToggleCollapse,
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
      color: NIVEL_COLORS[nivel],
    }))
  }, [stats])

  const topMunicipios = useMemo(() => {
    if (!stats?.top_municipios) return []
    return stats.top_municipios.slice(0, 10)
  }, [stats])

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
                  background: riesgoActivo === key ? `${info.color}22` : 'var(--bg-elevated)',
                  border: `1px solid ${riesgoActivo === key ? info.color : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={info.label}
              >
                {Icon && <Icon size={16} color={riesgoActivo === key ? info.color : 'var(--text-muted)'} />}
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
          <div className="sidebar-logo-icon">🌍</div>
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
                  style={{ '--tab-color': info.color }}
                  onClick={() => onRiesgoChange(key)}
                  title={info.description}
                >
                  <div
                    className="risk-tab-icon"
                    style={{
                      background: isActive ? `${info.color}22` : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    {Icon && (
                      <Icon
                        size={16}
                        color={isActive ? info.color : 'var(--text-muted)'}
                      />
                    )}
                  </div>
                  <span
                    className="risk-tab-label"
                    style={{ color: isActive ? info.color : undefined }}
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
                <span className="emoji">{mode.emoji}</span>
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
                        width: '100%', accentColor: 'var(--accent-blue)',
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
                        width: '100%', accentColor: 'var(--accent-cyan)',
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
                        style={{ '--check-color': NIVEL_COLORS[nivel] }}
                      />
                      <span
                        className="nivel-checkbox-dot"
                        style={{ background: NIVEL_COLORS[nivel] }}
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
                <div className="stat-mini-value" style={{ color: 'var(--accent-cyan)' }}>
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
            <div className="sidebar-section-title">Top Municipios</div>
            <div className="top-municipios-list">
              {topMunicipios.map((muni, i) => {
                const nivelColor = NIVEL_COLORS[muni.nivel] || NIVEL_COLORS['Sin datos']
                const isSelected = municipioSeleccionado &&
                  String(municipioSeleccionado.cod_municipio) === String(muni.cod)

                return (
                  <div
                    key={muni.cod || i}
                    className={`top-municipio-item${isSelected ? ' selected' : ''}`}
                    onClick={() => onSelectMunicipio({ ...muni, cod_municipio: muni.cod })}
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
                      {muni.total_eventos}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
