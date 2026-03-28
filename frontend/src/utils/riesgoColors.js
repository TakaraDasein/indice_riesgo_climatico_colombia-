// Definición de tipos de riesgo y colores del sistema

export const TIPOS_RIESGO = {
  riesgo_compuesto: {
    label: 'Riesgo Compuesto',
    icon: 'Zap',
    field: 'idx_riesgo_compuesto',
    nivel: 'nivel_riesgo_compuesto',
    color: '#8b5cf6',
    description: 'Índice combinado de todos los riesgos',
  },
  inundacion: {
    label: 'Inundación',
    icon: 'Waves',
    field: 'idx_inundacion',
    nivel: 'nivel_inundacion',
    color: '#3b82f6',
    description: 'Desbordamiento de ríos y lluvias extremas',
  },
  deslizamiento: {
    label: 'Deslizamiento',
    icon: 'Mountain',
    field: 'idx_deslizamiento',
    nivel: 'nivel_deslizamiento',
    color: '#a78bfa',
    description: 'Movimientos en masa y remoción de suelos',
  },
  incendio: {
    label: 'Incendio',
    icon: 'Flame',
    field: 'idx_incendio',
    nivel: 'nivel_incendio',
    color: '#f97316',
    description: 'Incendios forestales y de cobertura vegetal',
  },
  sequia: {
    label: 'Sequía',
    icon: 'Sun',
    field: 'idx_sequia',
    nivel: 'nivel_sequia',
    color: '#fbbf24',
    description: 'Déficit hídrico y períodos secos prolongados',
  },
  evento_extremo: {
    label: 'Vientos/Temporal',
    icon: 'Wind',
    field: 'idx_evento_extremo',
    nivel: 'nivel_evento_extremo',
    color: '#10b981',
    description: 'Vientos fuertes, granizo y tormentas eléctricas',
  },
  triangulado: {
    label: 'Índice Triangulado',
    icon: 'Triangle',
    field: 'idx_triangulado',
    nivel: 'nivel_triangulado',
    color: '#e879f9',
    description: 'Amenaza física (UNGRD) + Vulnerabilidad socioeconómica (IPM DANE) + Estrés térmico (IDEAM)',
  },
  ipm: {
    label: 'Pobreza Multidim.',
    icon: 'Users',
    field: 'idx_ipm',
    nivel: 'nivel_ipm',
    color: '#f59e0b',
    description: 'Índice de Pobreza Multidimensional Censal 2018 (DANE)',
  },
  temperatura: {
    label: 'Estrés Térmico',
    icon: 'Thermometer',
    field: 'idx_temperatura',
    nivel: 'nivel_temperatura',
    color: '#ef4444',
    description: 'Temperatura media anual — Normales Climatológicas IDEAM',
  },
}

export const NIVEL_COLORS = {
  'Sin datos': '#374151',
  'Bajo':      '#16a34a',
  'Medio':     '#d97706',
  'Alto':      '#ea580c',
  'Muy Alto':  '#dc2626',
}

export const NIVEL_BG = {
  'Sin datos': 'rgba(55,65,81,0.3)',
  'Bajo':      'rgba(22,163,74,0.15)',
  'Medio':     'rgba(217,119,6,0.15)',
  'Alto':      'rgba(234,88,12,0.15)',
  'Muy Alto':  'rgba(220,38,38,0.2)',
}

export const NIVEL_TEXT_COLORS = {
  'Sin datos': '#6b7280',
  'Bajo':      '#4ade80',
  'Medio':     '#fbbf24',
  'Alto':      '#fb923c',
  'Muy Alto':  '#f87171',
}

export const NIVELES_ORDEN = ['Sin datos', 'Bajo', 'Medio', 'Alto', 'Muy Alto']

/**
 * Convierte un índice 0-5 a color hex interpolado
 */
export function idxToColor(idx) {
  if (idx === null || idx === undefined || isNaN(idx)) return NIVEL_COLORS['Sin datos']
  const v = Math.max(0, Math.min(5, Number(idx)))
  if (v < 1)      return NIVEL_COLORS['Bajo']
  if (v < 2)      return NIVEL_COLORS['Bajo']
  if (v < 3)      return NIVEL_COLORS['Medio']
  if (v < 4)      return NIVEL_COLORS['Alto']
  return NIVEL_COLORS['Muy Alto']
}

/**
 * Convierte un índice 0-5 a texto de nivel
 */
export function idxToNivel(idx) {
  if (idx === null || idx === undefined || isNaN(idx)) return 'Sin datos'
  const v = Number(idx)
  if (v <= 0)   return 'Sin datos'
  if (v < 1.5)  return 'Bajo'
  if (v < 2.5)  return 'Medio'
  if (v < 3.5)  return 'Alto'
  return 'Muy Alto'
}

/**
 * Devuelve estilos inline para un badge de nivel
 */
export function nivelBadgeStyle(nivel) {
  return {
    background: NIVEL_BG[nivel] || NIVEL_BG['Sin datos'],
    color: NIVEL_TEXT_COLORS[nivel] || NIVEL_TEXT_COLORS['Sin datos'],
    border: `1px solid ${NIVEL_COLORS[nivel] || NIVEL_COLORS['Sin datos']}40`,
  }
}
