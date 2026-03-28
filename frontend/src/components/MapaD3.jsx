import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { NIVEL_COLORS, TIPOS_RIESGO } from '../utils/riesgoColors'

const MODE_LABELS = {
  municipios: 'Municipios',
  calor: 'Mapa de Calor',
  departamentos: 'Departamentos',
}

export default function MapaD3({
  geojson,
  riesgoActivo,
  mapMode,
  filtros,
  municipioSeleccionado,
  departamentoFiltro,
  onSelectMunicipio,
}) {
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const zoomRef = useRef(null)
  const projectionRef = useRef(null)
  const pathRef = useRef(null)

  // Escala de color para modo calor
  const colorScaleCalor = d3.scaleSequential([0, 5])
    .interpolator(d3.interpolateYlOrRd)

  // Obtener color de un feature según modo
  const getFeatureColor = useCallback((feature, riesgo, mode) => {
    const props = feature.properties || {}
    const tipoInfo = TIPOS_RIESGO[riesgo]

    if (mode === 'calor') {
      const idx = props[tipoInfo?.field]
      if (idx === null || idx === undefined || isNaN(Number(idx))) return '#1e293b'
      return colorScaleCalor(Math.max(0, Math.min(5, Number(idx))))
    }

    if (mode === 'municipios' || mode === 'departamentos') {
      const nivel = props[tipoInfo?.nivel] || 'Sin datos'
      return NIVEL_COLORS[nivel] || NIVEL_COLORS['Sin datos']
    }

    return '#1e293b'
  }, [])

  // Aplicar filtros a un feature
  const pasaFiltros = useCallback((feature, riesgo, filtros, departamentoFiltro) => {
    const props = feature.properties || {}
    const tipoInfo = TIPOS_RIESGO[riesgo]

    // Filtro departamento
    if (departamentoFiltro && departamentoFiltro !== '') {
      const dept = (props.departamento || '').trim().toLowerCase()
      if (dept !== departamentoFiltro.trim().toLowerCase()) return false
    }

    // Filtro rango índice
    if (filtros?.rango) {
      const idx = Number(props[tipoInfo?.field] || 0)
      if (idx < filtros.rango[0] || idx > filtros.rango[1]) return false
    }

    // Filtro niveles
    if (filtros?.niveles && filtros.niveles.length > 0) {
      const nivel = props[tipoInfo?.nivel] || 'Sin datos'
      if (!filtros.niveles.includes(nivel)) return false
    }

    return true
  }, [])

  // Dibujar / actualizar mapa
  useEffect(() => {
    if (!geojson || !svgRef.current) return

    const container = svgRef.current.parentElement
    const width = container.clientWidth
    const height = container.clientHeight

    const svg = d3.select(svgRef.current)
    svg.attr('width', width).attr('height', height)

    // Limpiar contenido previo
    svg.selectAll('*').remove()

    // Grupos con z-order
    const gBase = svg.append('g').attr('class', 'layer-base')
    const gMunis = svg.append('g').attr('class', 'layer-municipios')
    const gDeptos = svg.append('g').attr('class', 'layer-deptos')
    const gLabels = svg.append('g').attr('class', 'layer-labels')

    // Proyección
    const projection = d3.geoMercator().fitSize([width, height], geojson)
    projectionRef.current = projection
    const path = d3.geoPath().projection(projection)
    pathRef.current = path

    // Tooltip
    const tooltip = d3.select(tooltipRef.current)

    // ── Modo DEPARTAMENTOS: agrupar y colorear por promedio ──
    if (mapMode === 'departamentos') {
      const tipoInfo = TIPOS_RIESGO[riesgoActivo]
      // Calcular promedio por departamento
      const deptoMap = {}
      geojson.features.forEach(f => {
        const dept = (f.properties?.departamento || 'Sin datos').trim()
        if (!deptoMap[dept]) deptoMap[dept] = { sum: 0, count: 0, nivel: {} }
        const idx = Number(f.properties?.[tipoInfo?.field] || 0)
        const nivel = f.properties?.[tipoInfo?.nivel] || 'Sin datos'
        if (idx > 0) {
          deptoMap[dept].sum += idx
          deptoMap[dept].count++
        }
        deptoMap[dept].nivel[nivel] = (deptoMap[dept].nivel[nivel] || 0) + 1
      })

      // Función para color por departamento
      const getDeptColor = (dept) => {
        const data = deptoMap[dept]
        if (!data || data.count === 0) return NIVEL_COLORS['Sin datos']
        const avg = data.sum / data.count

        if (mapMode === 'calor' || true) {
          // Usar calor si modo calor, sino nivel más frecuente
          const nivelFrecuente = Object.entries(data.nivel)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin datos'
          return NIVEL_COLORS[nivelFrecuente] || NIVEL_COLORS['Sin datos']
        }
      }

      // Dibujar municipios con opacidad baja
      gMunis.selectAll('.muni-depto')
        .data(geojson.features)
        .join('path')
        .attr('class', 'muni-depto')
        .attr('d', path)
        .attr('fill', f => {
          const dept = (f.properties?.departamento || '').trim()
          return getDeptColor(dept)
        })
        .attr('opacity', 0.7)
        .attr('stroke', 'rgba(255,255,255,0.04)')
        .attr('stroke-width', 0.2)

      // Calcular centroides de departamentos para etiquetas
      const deptoFeatureMap = {}
      geojson.features.forEach(f => {
        const dept = (f.properties?.departamento || '').trim()
        if (!deptoFeatureMap[dept]) deptoFeatureMap[dept] = []
        deptoFeatureMap[dept].push(f)
      })

      // Bordes de departamento (union de paths)
      Object.entries(deptoFeatureMap).forEach(([dept, features]) => {
        if (features.length === 0) return
        const combinedGeo = { type: 'FeatureCollection', features }

        // Borde externo grueso
        gDeptos.append('path')
          .datum(combinedGeo)
          .attr('class', 'depto-path')
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255,255,255,0.3)')
          .attr('stroke-width', 1.5)
          .attr('stroke-linejoin', 'round')

        // Etiqueta centroide
        try {
          const merged = {
            type: 'Feature',
            geometry: {
              type: 'MultiPolygon',
              coordinates: features.flatMap(f => {
                if (f.geometry?.type === 'MultiPolygon') return f.geometry.coordinates
                if (f.geometry?.type === 'Polygon') return [f.geometry.coordinates]
                return []
              }),
            },
          }
          const centroid = path.centroid(merged)
          if (!isNaN(centroid[0]) && !isNaN(centroid[1])) {
            gLabels.append('text')
              .attr('class', 'depto-label')
              .attr('x', centroid[0])
              .attr('y', centroid[1])
              .attr('text-anchor', 'middle')
              .attr('dominant-baseline', 'middle')
              .style('fill', 'rgba(255,255,255,0.6)')
              .style('font-size', '8px')
              .style('font-weight', '600')
              .style('font-family', 'Inter, system-ui, sans-serif')
              .style('pointer-events', 'none')
              .style('letter-spacing', '0.3px')
              .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
              .text(dept.length > 10 ? dept.slice(0, 9) + '.' : dept)
          }
        } catch (_) {}
      })

      // Interacción sobre municipios
      gMunis.selectAll('.muni-depto')
        .on('mousemove', (event, f) => {
          const props = f.properties || {}
          const tipoInfo = TIPOS_RIESGO[riesgoActivo]
          const idx = props[tipoInfo?.field]
          const nivel = props[tipoInfo?.nivel] || 'Sin datos'
          showTooltip(event, props, nivel, idx)
        })
        .on('mouseleave', hideTooltip)
        .on('click', (event, f) => {
          event.stopPropagation()
          onSelectMunicipio && onSelectMunicipio(f.properties)
        })
    } else {
      // ── Modos MUNICIPIOS y CALOR ──
      gMunis.selectAll('.municipio-path')
        .data(geojson.features)
        .join('path')
        .attr('class', f => {
          const cod = f.properties?.cod_municipio
          const sel = municipioSeleccionado?.cod_municipio
          return `municipio-path${sel && String(cod) === String(sel) ? ' selected' : ''}`
        })
        .attr('d', path)
        .attr('fill', f => {
          if (!pasaFiltros(f, riesgoActivo, filtros, departamentoFiltro)) {
            return 'rgba(255,255,255,0.04)'
          }
          return getFeatureColor(f, riesgoActivo, mapMode)
        })
        .attr('opacity', f => pasaFiltros(f, riesgoActivo, filtros, departamentoFiltro) ? 1 : 0.2)
        .attr('stroke', f => {
          const cod = f.properties?.cod_municipio
          const sel = municipioSeleccionado?.cod_municipio
          if (sel && String(cod) === String(sel)) return 'white'
          return 'rgba(255,255,255,0.06)'
        })
        .attr('stroke-width', f => {
          const cod = f.properties?.cod_municipio
          const sel = municipioSeleccionado?.cod_municipio
          return sel && String(cod) === String(sel) ? 1.8 : 0.3
        })
        .style('cursor', 'pointer')
        .style('transition', 'filter 0.12s ease')
        .on('mousemove', (event, f) => {
          const props = f.properties || {}
          const tipoInfo = TIPOS_RIESGO[riesgoActivo]
          const idx = props[tipoInfo?.field]
          const nivel = props[tipoInfo?.nivel] || 'Sin datos'
          d3.select(event.currentTarget)
            .raise()
            .attr('stroke', 'rgba(255,255,255,0.5)')
            .attr('stroke-width', 1)
            .style('filter', 'brightness(1.3)')
          showTooltip(event, props, nivel, idx)
        })
        .on('mouseleave', (event, f) => {
          const cod = f.properties?.cod_municipio
          const sel = municipioSeleccionado?.cod_municipio
          d3.select(event.currentTarget)
            .attr('stroke', sel && String(cod) === String(sel) ? 'white' : 'rgba(255,255,255,0.06)')
            .attr('stroke-width', sel && String(cod) === String(sel) ? 1.8 : 0.3)
            .style('filter', null)
          hideTooltip()
        })
        .on('click', (event, f) => {
          event.stopPropagation()
          onSelectMunicipio && onSelectMunicipio(f.properties)
        })
    }

    // ── Zoom/Pan ──
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', (event) => {
        gBase.attr('transform', event.transform)
        gMunis.attr('transform', event.transform)
        gDeptos.attr('transform', event.transform)
        gLabels.attr('transform', event.transform)
      })

    zoomRef.current = zoom
    svg.call(zoom)
    svg.on('click', () => onSelectMunicipio && onSelectMunicipio(null))

    // Funciones tooltip
    function showTooltip(event, props, nivel, idx) {
      const tipoInfo = TIPOS_RIESGO[riesgoActivo]
      const nivelColor = NIVEL_COLORS[nivel] || NIVEL_COLORS['Sin datos']

      tooltip
        .style('opacity', '1')
        .html(`
          <div class="map-tooltip-name">${props.municipio || 'Sin nombre'}</div>
          <div class="map-tooltip-dept">${props.departamento || ''}</div>
          <div class="map-tooltip-row">
            <span class="map-tooltip-key">${tipoInfo?.label || 'Riesgo'}</span>
            <span class="map-tooltip-val">${idx !== null && idx !== undefined ? Number(idx).toFixed(2) : '—'}</span>
          </div>
          <div class="map-tooltip-row">
            <span class="map-tooltip-key">Nivel</span>
            <span class="map-tooltip-badge" style="background:${nivelColor}22;color:${nivelColor};border:1px solid ${nivelColor}44">${nivel}</span>
          </div>
          ${props.total_eventos ? `<div class="map-tooltip-row"><span class="map-tooltip-key">Eventos</span><span class="map-tooltip-val">${props.total_eventos}</span></div>` : ''}
        `)
        .style('left', `${event.clientX}px`)
        .style('top', `${event.clientY}px`)
    }

    function hideTooltip() {
      tooltip.style('opacity', '0')
    }

    return () => {
      svg.on('.zoom', null)
    }
  }, [geojson, riesgoActivo, mapMode, filtros, municipioSeleccionado, departamentoFiltro, getFeatureColor, pasaFiltros])

  // Handlers de zoom externo
  const handleZoomIn = () => {
    if (!zoomRef.current || !svgRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5)
  }

  const handleZoomOut = () => {
    if (!zoomRef.current || !svgRef.current) return
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.67)
  }

  const handleReset = () => {
    if (!zoomRef.current || !svgRef.current) return
    d3.select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity)
  }

  const tipoInfo = TIPOS_RIESGO[riesgoActivo]

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* SVG del mapa */}
      <svg ref={svgRef} className="map-svg" />

      {/* Tooltip flotante */}
      <div
        ref={tooltipRef}
        className="map-tooltip"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      {/* Info overlay superior izquierda */}
      <div className="map-info-overlay">
        <div
          className="map-info-risk-icon"
          style={{ background: `${tipoInfo?.color}22` }}
        >
          <span style={{ fontSize: 14 }}>
            {riesgoActivo === 'riesgo_compuesto' ? '⚡' :
             riesgoActivo === 'triangulado' ? '🔺' :
             riesgoActivo === 'ipm' ? '👥' :
             riesgoActivo === 'temperatura' ? '🌡️' :
             riesgoActivo === 'inundacion' ? '🌊' :
             riesgoActivo === 'deslizamiento' ? '⛰️' :
             riesgoActivo === 'incendio' ? '🔥' :
             riesgoActivo === 'sequia' ? '☀️' : '💨'}
          </span>
        </div>
        <div>
          <div className="map-info-risk-name" style={{ color: tipoInfo?.color }}>
            {tipoInfo?.label}
          </div>
          <div className="map-info-mode-tag">{MODE_LABELS[mapMode]}</div>
        </div>
      </div>

      {/* Controles de zoom */}
      <div className="map-controls">
        <button className="map-control-btn" onClick={handleZoomIn} title="Acercar">+</button>
        <button className="map-control-btn" onClick={handleZoomOut} title="Alejar">−</button>
        <div className="map-control-divider" />
        <button className="map-control-btn" onClick={handleReset} title="Resetear vista" style={{ fontSize: 12 }}>⌂</button>
      </div>

      {/* Leyenda */}
      {mapMode === 'calor' ? (
        <div className="map-legend">
          <div className="map-legend-title">{tipoInfo?.label}</div>
          <div className="legend-gradient" />
          <div className="legend-gradient-labels">
            <span>Bajo (0)</span>
            <span>Alto (5)</span>
          </div>
        </div>
      ) : (
        <div className="map-legend">
          <div className="map-legend-title">Nivel de Riesgo</div>
          <div className="legend-items">
            {Object.entries(NIVEL_COLORS).map(([nivel, color]) => (
              <div key={nivel} className="legend-item">
                <div className="legend-dot" style={{ background: color }} />
                <span className="legend-label">{nivel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
