import { useMemo } from 'react'
import { X, Filter, MapPin } from 'lucide-react'
import { TIPOS_RIESGO, NIVEL_COLORS_BY_RIESGO, SELECTED_INDICATOR } from '../utils/riesgoColors'

/**
 * Barra de chips para los filtros activos + contador de municipios filtrados.
 *
 * Props:
 *   filtros          – { rango: [min, max], niveles: [] }
 *   departamentoFiltro – string
 *   riesgoActivo     – string (clave de TIPOS_RIESGO)
 *   geojson          – FeatureCollection completo
 *   panelSelection   – Set<string> | null  (códigos seleccionados desde el panel inferior)
 *   onRemoveNivel    – (nivel) => void
 *   onRemoveRango    – () => void
 *   onRemoveDepartamento – () => void
 *   onRemovePanelSelection – () => void
 *   onClearAll       – () => void
 */
export default function FiltrosActivos({
  filtros,
  departamentoFiltro,
  riesgoActivo,
  geojson,
  panelSelection,
  onRemoveNivel,
  onRemoveRango,
  onRemoveDepartamento,
  onRemovePanelSelection,
  onClearAll,
}) {
  const tipoInfo = TIPOS_RIESGO[riesgoActivo]

  // Determinar chips activos
  const rangoActivo = filtros?.rango &&
    (filtros.rango[0] > 0 || filtros.rango[1] < 5)

  const nivelesActivos = filtros?.niveles?.length > 0
    ? filtros.niveles
    : []

  const panelActivo = panelSelection && panelSelection.size > 0

  const hayChips = rangoActivo || nivelesActivos.length > 0 || !!departamentoFiltro || panelActivo

  // Contar municipios que pasan los filtros activos
  const { count, total } = useMemo(() => {
    if (!geojson?.features) return { count: 0, total: 0 }
    const total = geojson.features.length
    if (!hayChips) return { count: total, total }

    const count = geojson.features.filter(f => {
      const props = f.properties || {}
      const field = tipoInfo?.field
      const nivelField = tipoInfo?.nivel

      // Filtro panel inferior
      if (panelActivo) {
        if (!panelSelection.has(String(props.cod_municipio))) return false
      }

      // Filtro departamento
      if (departamentoFiltro) {
        const dept = (props.departamento || '').trim().toLowerCase()
        if (dept !== departamentoFiltro.trim().toLowerCase()) return false
      }

      // Filtro rango
      if (rangoActivo) {
        const idx = Number(props[field] || 0)
        if (idx < filtros.rango[0] || idx > filtros.rango[1]) return false
      }

      // Filtro niveles
      if (nivelesActivos.length > 0) {
        const nivel = props[nivelField] || 'Sin datos'
        if (!nivelesActivos.includes(nivel)) return false
      }

      return true
    }).length

    return { count, total }
  }, [geojson, filtros, departamentoFiltro, riesgoActivo, panelSelection, hayChips, tipoInfo, rangoActivo, nivelesActivos, panelActivo])

  if (!hayChips) {
    // Solo mostrar contador pasivo cuando no hay filtros
    return (
      <div style={styles.bar}>
        <div style={styles.counter}>
          <Filter size={11} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>
            {total.toLocaleString()} municipios
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.bar}>
      {/* Contador */}
      <div style={styles.counter}>
        <Filter size={11} style={{ color: SELECTED_INDICATOR, flexShrink: 0 }} />
        <span style={{ color: SELECTED_INDICATOR, fontWeight: 600, fontSize: 11 }}>
          {count.toLocaleString()}
        </span>
        <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>
          / {total.toLocaleString()} municipios
        </span>
      </div>

      <div style={styles.divider} />

      {/* Chips */}
      <div style={styles.chips}>

        {/* Chip selección panel inferior */}
        {panelActivo && (
          <Chip
            label={`Análisis: ${panelSelection.size} municipios`}
            color={SELECTED_INDICATOR}
            onRemove={onRemovePanelSelection}
          />
        )}

        {/* Chip departamento */}
        {departamentoFiltro && (
          <Chip
            label={<><MapPin size={9} strokeWidth={2} style={{ flexShrink: 0 }} /> {departamentoFiltro}</>}
            color="var(--border-strong)"
            onRemove={onRemoveDepartamento}
          />
        )}

        {/* Chip rango */}
        {rangoActivo && (
          <Chip
            label={`${tipoInfo?.label ?? 'Índice'}: ${filtros.rango[0].toFixed(1)} – ${filtros.rango[1].toFixed(1)}`}
            color="var(--text-secondary)"
            onRemove={onRemoveRango}
          />
        )}

        {/* Chips de nivel */}
        {nivelesActivos.map(nivel => (
          <Chip
            key={nivel}
            label={nivel}
            color={NIVEL_COLORS_BY_RIESGO[riesgoActivo]?.[nivel] || 'var(--text-muted)'}
            onRemove={() => onRemoveNivel(nivel)}
          />
        ))}
      </div>

      {/* Limpiar todo */}
      <button
        onClick={onClearAll}
        title="Limpiar todos los filtros"
        style={styles.clearBtn}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-disabled)'}
      >
        Limpiar todo
      </button>
    </div>
  )
}

function Chip({ label, color, onRemove }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px 2px 8px',
        background: `${color}18`,
        border: `1px solid ${color}44`,
        borderRadius: 20,
        fontSize: 11,
        color,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span>{label}</span>
      <button
        onClick={onRemove}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color,
          opacity: 0.7,
          lineHeight: 1,
        }}
        title={`Eliminar filtro "${label}"`}
      >
        <X size={10} />
      </button>
    </div>
  )
}

const styles = {
  bar: {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(15, 23, 42, 0.88)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--border)',
    borderRadius: 24,
    padding: '5px 12px',
    maxWidth: 'calc(100% - 48px)',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
    fontFamily: 'var(--font-sans)',
  },
  counter: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  divider: {
    width: 1,
    height: 14,
    background: 'var(--border)',
    flexShrink: 0,
  },
  chips: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    overflowX: 'auto',
    scrollbarWidth: 'none',
    flexShrink: 1,
    minWidth: 0,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 10,
    color: 'var(--text-disabled)',
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    padding: '0 2px',
    transition: 'color 0.15s',
  },
}
