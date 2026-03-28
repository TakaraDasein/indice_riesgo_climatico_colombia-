import { useState, useCallback } from 'react'
import { Globe, AlertTriangle, MousePointer } from 'lucide-react'
import Sidebar from './components/Sidebar'
import MapaD3 from './components/MapaD3'
import FichaMunicipio from './components/FichaMunicipio'
import DocumentacionModal from './components/DocumentacionModal'
import FiltrosActivos from './components/FiltrosActivos'
import PanelInferior from './components/PanelInferior'
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
  const [municipiosComparar, setMunicipiosComparar] = useState([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  // Selección desde panel inferior (scatter/boxplot/correlación)
  // null = sin selección activa; Set<string> = códigos filtrados
  const [panelSelection, setPanelSelection] = useState(null)

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

  // ── Callbacks de eliminación de filtros individuales ──────
  const handleRemoveNivel = useCallback((nivel) => {
    setFiltros(f => ({
      ...f,
      niveles: (f.niveles || []).filter(n => n !== nivel),
    }))
  }, [])

  const handleRemoveRango = useCallback(() => {
    setFiltros(f => ({ ...f, rango: [0, 5] }))
  }, [])

  const handleRemoveDepartamento = useCallback(() => {
    setDepartamentoFiltro('')
  }, [])

  const handleClearAllFiltros = useCallback(() => {
    setFiltros({ rango: [0, 5], niveles: [] })
    setDepartamentoFiltro('')
    setPanelSelection(null)
  }, [])

  // ── Panel inferior: selección → filtro dinámico ───────────
  const handlePanelSelection = useCallback((codigos) => {
    // codigos: Set<string> | null
    setPanelSelection(codigos && codigos.size > 0 ? codigos : null)
  }, [])

  // ── Callbacks de comparación de municipios ────────────────
  const handleToggleComparar = useCallback((municipio) => {
    if (!municipio) return
    setMunicipiosComparar(prev => {
      const cod = String(municipio.cod_municipio)
      const already = prev.find(m => String(m.cod_municipio) === cod)
      if (already) return prev.filter(m => String(m.cod_municipio) !== cod)
      if (prev.length >= 3) return prev  // máx 3
      return [...prev, municipio]
    })
  }, [])

  const handleClearComparar = useCallback(() => {
    setMunicipiosComparar([])
  }, [])

  // ── Render: cargando ──────────────────────────────────────
  if (loading) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 60, height: 60,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(255,255,255,0.06)',
            animation: 'pulse-glow 2s ease infinite',
          }}>
            <Globe size={28} color="var(--text-primary)" strokeWidth={1.5} />
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
          <AlertTriangle size={48} color="var(--text-secondary)" strokeWidth={1.5} />
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
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              $ python app.py
            </p>
            <p style={{ marginTop: 8 }}>2. Verifica que el GeoJSON existe:</p>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
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
        geojson={geojson}
        departamentos={departamentos}
        departamentoFiltro={departamentoFiltro}
        onDepartamentoChange={setDepartamentoFiltro}
        municipioSeleccionado={municipioSeleccionado}
        onSelectMunicipio={handleSelectMunicipio}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        onOpenDoc={() => setDocOpen(true)}
      />

      {/* Columna central: mapa + panel inferior */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, overflow: 'hidden' }}>

        {/* Área principal del mapa */}
        <main className="map-area" style={{ flex: 1, height: 'auto' }}>
          {geojson ? (
            <MapaD3
              geojson={geojson}
              riesgoActivo={riesgoActivo}
              mapMode={mapMode}
              filtros={filtros}
              municipioSeleccionado={municipioSeleccionado}
              departamentoFiltro={departamentoFiltro}
              panelSelection={panelSelection}
              onSelectMunicipio={handleSelectMunicipio}
            />
          ) : (
            <div className="map-loading">
              <div className="map-loading-spinner" />
              <p className="map-loading-text">Preparando mapa...</p>
            </div>
          )}

          {/* Chips de filtros activos + contador municipios */}
          {geojson && (
            <FiltrosActivos
              filtros={filtros}
              departamentoFiltro={departamentoFiltro}
              riesgoActivo={riesgoActivo}
              geojson={geojson}
              panelSelection={panelSelection}
              onRemoveNivel={handleRemoveNivel}
              onRemoveRango={handleRemoveRango}
              onRemoveDepartamento={handleRemoveDepartamento}
              onRemovePanelSelection={() => setPanelSelection(null)}
              onClearAll={handleClearAllFiltros}
            />
          )}

          {/* Hint inicial */}
          {!municipioSeleccionado && geojson && (
            <div className="map-empty-hint">
              <span className="map-empty-hint-icon"><MousePointer size={16} strokeWidth={1.5} /></span>
              Haz clic en un municipio para ver su ficha de riesgos
            </div>
          )}
        </main>

        {/* Panel de análisis inferior */}
        {geojson && (
          <PanelInferior
            geojson={geojson}
            riesgoActivo={riesgoActivo}
            departamentoFiltro={departamentoFiltro}
            municipioSeleccionado={municipioSeleccionado}
            panelSelection={panelSelection}
            onPanelSelection={handlePanelSelection}
            onSelectMunicipio={handleSelectMunicipio}
          />
        )}
      </div>

      {/* Panel derecho - Ficha municipio */}
      <FichaMunicipio
        municipio={municipioSeleccionado}
        onClose={handleCloseFicha}
        riesgoActivo={riesgoActivo}
        geojson={geojson}
        municipiosComparar={municipiosComparar}
        onToggleComparar={handleToggleComparar}
        onClearComparar={handleClearComparar}
      />

      {/* Modal de documentación */}
      <DocumentacionModal open={docOpen} onClose={() => setDocOpen(false)} />
    </div>
  )
}
