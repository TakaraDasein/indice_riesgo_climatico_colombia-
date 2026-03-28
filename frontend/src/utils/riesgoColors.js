// Definición de tipos de riesgo y sistema de colores
// Principio: color más oscuro = más riesgo, color más claro = menos riesgo

// ── Escalas secuenciales por tipo (Muy Bajo → Bajo → Medio → Alto → Muy Alto) ──
// Index: 0=Sin datos, 1=Bajo, 2=Medio, 3=Alto, 4=Muy Alto
export const SCALE_ARRAYS = {
  riesgo_compuesto: ['#f0ede3', '#c8c4aa', '#9c9483', '#6b6050', '#413931'],
  triangulado:      ['#f5efe0', '#d4c49a', '#b4a070', '#7d6640', '#4a3820'],
  inundacion:       ['#e8f5e0', '#cde6bd', '#9cac8b', '#5a8a60', '#2d4d35'],
  deslizamiento:    ['#f5e8d8', '#dba878', '#bd7341', '#945220', '#624129'],
  incendio:         ['#fef1e8', '#fdcba0', '#fd7647', '#b84820', '#6b2210'],
  sequia:           ['#faf3e3', '#eebd7b', '#c99040', '#8c5e20', '#4d3010'],
  evento_extremo:   ['#fce8f0', '#f69cb4', '#d55a7b', '#8a3060', '#3f3760'],
  ipm:              ['#eeece5', '#b4b49c', '#808070', '#585548', '#3a3530'],
  temperatura:      ['#fef6ee', '#f5d4a0', '#eebd7b', '#c07040', '#7a3020'],
  departamentos:    ['#f0ede3', '#c8c4aa', '#9c9483', '#6b6050', '#413931'],
}

// Orden canónico de niveles
export const NIVELES_ORDEN = ['Sin datos', 'Bajo', 'Medio', 'Alto', 'Muy Alto']

// Mapeo nivel → índice en SCALE_ARRAYS (0=Bajo, 1=Medio, 2=Alto, 3=Muy Alto)
const NIVEL_TO_IDX = { 'Sin datos': null, 'Bajo': 0, 'Medio': 1, 'Alto': 2, 'Muy Alto': 3 }

// ── Color especial para sin datos ──
export const SIN_DATOS_COLOR = '#4a4a4a'

// ── Color de indicador de selección activa ──
export const SELECTED_INDICATOR = '#f8eee4'

// ── NIVEL_COLORS_BY_RIESGO: objeto anidado [riesgo][nivel] → color hex ──
export const NIVEL_COLORS_BY_RIESGO = Object.fromEntries(
  Object.entries(SCALE_ARRAYS).map(([riesgo, scale]) => [
    riesgo,
    {
      'Sin datos': SIN_DATOS_COLOR,
      'Bajo':      scale[0],
      'Medio':     scale[1],
      'Alto':      scale[2],
      'Muy Alto':  scale[3],
    },
  ])
)

// ── Helpers ──

/** Obtiene el color de nivel para un tipo de riesgo específico */
export function getNivelColor(riesgo, nivel) {
  return NIVEL_COLORS_BY_RIESGO[riesgo]?.[nivel] ?? SIN_DATOS_COLOR
}

/** Obtiene el background semitransparente para un nivel badge */
export function getNivelBg(riesgo, nivel) {
  const col = getNivelColor(riesgo, nivel)
  return `${col}28`
}

/** Obtiene el color de texto sobre un badge de nivel (claro u oscuro según luminancia) */
export function getNivelTextColor(riesgo, nivel) {
  const col = getNivelColor(riesgo, nivel)
  // Si es sin datos (gris oscuro), usar texto claro
  if (!col || col === SIN_DATOS_COLOR) return '#a0a0a0'
  // Extraer luminancia aproximada del hex
  const r = parseInt(col.slice(1, 3), 16) / 255
  const g = parseInt(col.slice(3, 5), 16) / 255
  const b = parseInt(col.slice(5, 7), 16) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.55 ? '#262626' : '#f8f8f8'
}

/** Devuelve estilos inline para un badge de nivel (dinámico por riesgo) */
export function nivelBadgeStyle(riesgo, nivel) {
  const col = getNivelColor(riesgo, nivel)
  return {
    background: `${col}28`,
    color: getNivelTextColor(riesgo, nivel),
    border: `1px solid ${col}50`,
  }
}

// ── Definición de tipos de riesgo ──
// color = step[2] (Medio) de la escala para uso en íconos/tabs activos
export const TIPOS_RIESGO = {
  riesgo_compuesto: {
    label: 'Riesgo Compuesto',
    icon: 'Zap',
    field: 'idx_riesgo_compuesto',
    nivel: 'nivel_riesgo_compuesto',
    color: '#9c9483',   // Medio de escala olive gray
    scale: SCALE_ARRAYS.riesgo_compuesto,
    description: 'Índice combinado de todos los riesgos',
  },
  inundacion: {
    label: 'Inundación',
    icon: 'Waves',
    field: 'idx_inundacion',
    nivel: 'nivel_inundacion',
    color: '#9cac8b',   // Medio de escala cool green
    scale: SCALE_ARRAYS.inundacion,
    description: 'Desbordamiento de ríos y lluvias extremas',
  },
  deslizamiento: {
    label: 'Deslizamiento',
    icon: 'Mountain',
    field: 'idx_deslizamiento',
    nivel: 'nivel_deslizamiento',
    color: '#bd7341',   // Medio de escala earth brown
    scale: SCALE_ARRAYS.deslizamiento,
    description: 'Movimientos en masa y remoción de suelos',
  },
  incendio: {
    label: 'Incendio',
    icon: 'Flame',
    field: 'idx_incendio',
    nivel: 'nivel_incendio',
    color: '#fd7647',   // Medio de escala fire orange
    scale: SCALE_ARRAYS.incendio,
    description: 'Incendios forestales y de cobertura vegetal',
  },
  sequia: {
    label: 'Sequía',
    icon: 'Sun',
    field: 'idx_sequia',
    nivel: 'nivel_sequia',
    color: '#c99040',   // Medio de escala dry amber
    scale: SCALE_ARRAYS.sequia,
    description: 'Déficit hídrico y períodos secos prolongados',
  },
  evento_extremo: {
    label: 'Vientos/Temporal',
    icon: 'Wind',
    field: 'idx_evento_extremo',
    nivel: 'nivel_evento_extremo',
    color: '#d55a7b',   // Medio de escala storm purple
    scale: SCALE_ARRAYS.evento_extremo,
    description: 'Vientos fuertes, granizo y tormentas eléctricas',
  },
  triangulado: {
    label: 'Índice Triangulado',
    icon: 'Triangle',
    field: 'idx_triangulado',
    nivel: 'nivel_triangulado',
    color: '#b4a070',   // Medio de escala warm sand
    scale: SCALE_ARRAYS.triangulado,
    description: 'Amenaza física (UNGRD) + Vulnerabilidad socioeconómica (IPM DANE) + Estrés térmico (IDEAM)',
  },
  ipm: {
    label: 'Pobreza Multidim.',
    icon: 'Users',
    field: 'idx_ipm',
    nivel: 'nivel_ipm',
    color: '#808070',   // Medio de escala cool olive
    scale: SCALE_ARRAYS.ipm,
    description: 'Índice de Pobreza Multidimensional Censal 2018 (DANE)',
  },
  temperatura: {
    label: 'Estrés Térmico',
    icon: 'Thermometer',
    field: 'idx_temperatura',
    nivel: 'nivel_temperatura',
    color: '#eebd7b',   // Medio de escala amber-rose
    scale: SCALE_ARRAYS.temperatura,
    description: 'Temperatura media anual — Normales Climatológicas IDEAM',
  },
}

// ── Shim de compatibilidad (deprecado — usar NIVEL_COLORS_BY_RIESGO) ──
export const NIVEL_COLORS = NIVEL_COLORS_BY_RIESGO.riesgo_compuesto

// ── Shim NIVEL_BG / NIVEL_TEXT_COLORS para componentes no migrados aún ──
export const NIVEL_BG = Object.fromEntries(
  NIVELES_ORDEN.map(n => [n, getNivelBg('riesgo_compuesto', n)])
)
export const NIVEL_TEXT_COLORS = Object.fromEntries(
  NIVELES_ORDEN.map(n => [n, getNivelTextColor('riesgo_compuesto', n)])
)

// ── Colores para comparación multi-municipio ──
// Uno por familia de escala, posición Alto (index 2)
export const COMPARE_COLORS = [
  '#9c9483',  // riesgo_compuesto Medio (olive gray)
  '#bd7341',  // deslizamiento Medio (earth brown)
  '#d55a7b',  // evento_extremo Medio (storm purple)
  '#5a8a60',  // inundacion Alto (cool green)
]

// ── Colores para serie temporal (una línea por tipo de evento) ──
export const SERIE_COLORS = {
  inundacion:     '#5a8a60',  // inundacion Alto
  deslizamiento:  '#945220',  // deslizamiento Alto
  incendio:       '#fd7647',  // incendio Medio (vívido)
  sequia:         '#c99040',  // sequia Medio
  evento_extremo: '#8a3060',  // evento_extremo Alto
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
 * Convierte un índice 0-5 a color hex para un tipo de riesgo dado
 */
export function idxToColor(idx, riesgo = 'riesgo_compuesto') {
  const nivel = idxToNivel(idx)
  return getNivelColor(riesgo, nivel)
}
