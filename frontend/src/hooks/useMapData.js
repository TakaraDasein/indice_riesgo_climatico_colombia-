import { useState, useEffect, useCallback } from 'react'

/**
 * Hook para cargar datos del mapa desde el backend Flask
 */
export function useMapData() {
  const [geojson, setGeojson] = useState(null)
  const [stats, setStats] = useState(null)
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [geoRes, statsRes, deptoRes] = await Promise.all([
        fetch('/api/municipios'),
        fetch('/api/stats'),
        fetch('/api/departamentos'),
      ])

      if (!geoRes.ok) throw new Error(`GeoJSON: ${geoRes.status} ${geoRes.statusText}`)
      if (!statsRes.ok) throw new Error(`Stats: ${statsRes.status} ${statsRes.statusText}`)
      if (!deptoRes.ok) throw new Error(`Departamentos: ${deptoRes.status} ${deptoRes.statusText}`)

      const [geoData, statsData, deptoData] = await Promise.all([
        geoRes.json(),
        statsRes.json(),
        deptoRes.json(),
      ])

      setGeojson(geoData)
      setStats(statsData)
      setDepartamentos(deptoData)
    } catch (err) {
      console.error('[useMapData] Error cargando datos:', err)
      setError(err.message || 'Error desconocido al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { geojson, stats, departamentos, loading, error, refetch: fetchAll }
}
