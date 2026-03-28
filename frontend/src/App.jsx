import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import MapaD3 from './components/MapaD3'
import FichaMunicipio from './components/FichaMunicipio'
import DocumentacionModal from './components/DocumentacionModal'
import { useMapData } from './hooks/useMapData'

const INITIAL_FILTROS = {
  rango: [0, 5],
  niveles: [],
}

export default function App() {
  // ── Estado global ────────────────────────────────────────
  const [riesgoActivo, setRiesgoActivo] = useState('riesgo_compuesto')
  const [mapMode, setMapMode] = useState('municipios')
  const [filtros, setFiltros] = useState(INITIAL_FILTROS)
  const [departamentoFiltro, setDepartamentoFiltro] = useState('')
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [docOpen, setDocOpen] = useState(false)

  // ── Datos del backend ─────────────────────────────────────
  const { geojson, stats, departamentos, loading, error, refetch } = useMapData()

  // ── Handlers ──────────────────────────────────────────────
  const handleSelectMunicipio = useCallback((props) => {
    if (!props) {
      setMunicipioSeleccionado(null)
      return
    }
    // Si es un objeto del top-municipios (sólo tiene cod, nombre, etc.), buscar en geojson
    if (props.cod && !props.municipio && geojson) {
      const feature = geojson.features.find(
        f => String(f.properties?.cod_municipio) === String(props.cod)
      )
      if (feature) {
        setMunicipioSeleccionado(feature.properties)
        return
      }
    }
    setMunicipioSeleccionado(props)
  }, [geojson])

  const handleCloseFicha = useCallback(() => {
    setMunicipioSeleccionado(null)
  }, [])

  // ── Render: cargando ──────────────────────────────────────
  if (loading) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
            boxShadow: '0 0 30px rgba(59,130,246,0.4)',
            animation: 'pulse-glow 2s ease infinite',
          }}>
            🌍
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div className="map-loading-spinner" />
            <p className="map-loading-text">Cargando datos de riesgos climáticos...</p>
            <p style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
              Preparando datos de municipios...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: error ─────────────────────────────────────────
  if (error) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            maxWidth: 480,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ fontSize: 48 }}>⚠️</span>
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: 18 }}>
              Error al cargar datos
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
              {error}
            </p>
          </div>
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <p>1. Asegúrate que Flask está corriendo:</p>
            <p style={{ color: 'var(--accent-cyan)', marginTop: 4 }}>
              $ python app.py
            </p>
            <p style={{ marginTop: 8 }}>2. Verifica que el GeoJSON existe:</p>
            <p style={{ color: 'var(--accent-cyan)', marginTop: 4 }}>
              data/processed/municipios_riesgo.geojson
            </p>
          </div>
          <button
            onClick={refetch}
            style={{
              padding: '10px 24px',
              background: 'var(--accent-blue)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Reintentar conexión
          </button>
        </div>
      </div>
    )
  }

  // ── Render principal ──────────────────────────────────────
  return (
    <div className="app">
      {/* Panel izquierdo */}
      <Sidebar
        riesgoActivo={riesgoActivo}
        onRiesgoChange={setRiesgoActivo}
        mapMode={mapMode}
        onMapModeChange={setMapMode}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        stats={stats}
        departamentos={departamentos}
        departamentoFiltro={departamentoFiltro}
        onDepartamentoChange={setDepartamentoFiltro}
        municipioSeleccionado={municipioSeleccionado}
        onSelectMunicipio={handleSelectMunicipio}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      {/* Área principal del mapa */}
      <main className="map-area">
        {geojson ? (
          <MapaD3
            geojson={geojson}
            riesgoActivo={riesgoActivo}
            mapMode={mapMode}
            filtros={filtros}
            municipioSeleccionado={municipioSeleccionado}
            departamentoFiltro={departamentoFiltro}
            onSelectMunicipio={handleSelectMunicipio}
          />
        ) : (
          <div className="map-loading">
            <div className="map-loading-spinner" />
            <p className="map-loading-text">Preparando mapa...</p>
          </div>
        )}

        {/* Hint inicial */}
        {!municipioSeleccionado && geojson && (
          <div className="map-empty-hint">
            <span className="map-empty-hint-icon">👆</span>
            Haz clic en un municipio para ver su ficha de riesgos
          </div>
        )}

        {/* Botón documentación */}
        <button
          onClick={() => setDocOpen(true)}
          title="Acerca del índice y metodología"
          style={{
            position: 'absolute', bottom: 16, left: 16,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 10,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e879f9'; e.currentTarget.style.color = '#e879f9' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <span style={{ fontSize: 13 }}>🔺</span>
          Metodología e Índices
        </button>
      </main>

      {/* Panel derecho - Ficha municipio */}
      <FichaMunicipio
        municipio={municipioSeleccionado}
        onClose={handleCloseFicha}
        riesgoActivo={riesgoActivo}
        geojson={geojson}
      />

      {/* Modal de documentación */}
      <DocumentacionModal open={docOpen} onClose={() => setDocOpen(false)} />
    </div>
  )
}
