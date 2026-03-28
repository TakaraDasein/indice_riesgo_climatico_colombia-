import { useState } from 'react'
import {
  X, ChevronDown, ChevronRight,
  Zap, Users, Thermometer, Ruler, Database, HelpCircle, Settings, Triangle,
} from 'lucide-react'

// ── Datos de la documentación ────────────────────────────────────────────────

const DIMENSIONES = [
  {
    id: 'amenaza',
    Icon: Zap,
    titulo: 'Dimensión 1 — Amenaza Física',
    peso: '55%',
    color: '#9c9483',   // olive gray — riesgo compuesto Medio
    fuente: 'UNGRD (Unidad Nacional para la Gestión del Riesgo de Desastres)',
    descripcion: 'Captura la frecuencia histórica de eventos de emergencia registrados por la UNGRD entre 2019 y 2026. A mayor número de eventos pasados, mayor exposición estructural del territorio.',
    indicadores: [
      { nombre: 'Inundación', peso: '20%', campo: 'idx_inundacion', incluye: 'Inundaciones, crecientes súbitas, avenidas torrenciales' },
      { nombre: 'Deslizamiento', peso: '20%', campo: 'idx_deslizamiento', incluye: 'Movimientos en masa, deslizamientos, erosión' },
      { nombre: 'Incendio forestal', peso: '10%', campo: 'idx_incendio', incluye: 'Incendios de cobertura vegetal y forestales' },
      { nombre: 'Evento extremo', peso: '5%', campo: 'idx_evento_extremo', incluye: 'Vendavales, granizo, tormentas eléctricas, oleaje' },
    ],
    nota: 'Cada subíndice se normaliza 0–5 usando el percentil 95 como valor de referencia, para atenuar el efecto de municipios extremos.',
  },
  {
    id: 'vulnerabilidad',
    Icon: Users,
    titulo: 'Dimensión 2 — Vulnerabilidad Socioeconómica',
    peso: '30%',
    color: '#808070',   // cool olive — ipm Medio
    fuente: 'DANE — Índice de Pobreza Multidimensional Censal 2018',
    descripcion: 'El IPM mide la privación simultánea en cinco dimensiones del hogar: condiciones educativas, condiciones de la niñez, trabajo, salud y acceso a servicios. Un municipio más pobre tiene menor capacidad de anticiparse, resistir y recuperarse de un evento climático.',
    indicadores: [
      { nombre: 'IPM Total', peso: '30%', campo: 'idx_ipm', incluye: 'Hogares con privación en 1+ de 5 dimensiones del bienestar (cobertura 1122 municipios)' },
    ],
    nota: 'El IPM (escala 0–100%) se convierte a escala 0–5 mediante regla de tres directa: IPM% / 100 × 5. Mayor pobreza → mayor vulnerabilidad → mayor riesgo.',
  },
  {
    id: 'termico',
    Icon: Thermometer,
    titulo: 'Dimensión 3 — Estrés Térmico',
    peso: '15%',
    color: '#c07040',   // amber-rose — temperatura Medio
    fuente: 'IDEAM — Normales Climatológicas de Colombia (dataset nsz2-kzcq)',
    descripcion: 'Temperatura media anual por estación meteorológica. Municipios de tierras bajas y caribe colombiano con temperaturas superiores a 27 °C enfrentan mayor riesgo por olas de calor, estrés hídrico e impacto en salud pública.',
    indicadores: [
      { nombre: 'Temperatura media anual', peso: '15%', campo: 'idx_temperatura', incluye: '356 municipios con estación IDEAM; resto imputados con media nacional (~22 °C)' },
    ],
    nota: 'Normalización por percentil 5–95 de la distribución colombiana (6 °C páramo andino → 29 °C costa/llanos). Valores fuera del rango se recortan a 0–5.',
  },
]

const PREGUNTAS = [
  {
    q: '¿Qué problema resuelve este mapa?',
    r: 'Integra en una sola visualización tres fuentes de datos públicas colombianas — emergencias históricas (UNGRD), pobreza multidimensional (DANE) y clima (IDEAM) — que normalmente se consultan por separado. Permite identificar los municipios donde la amenaza física se superpone con alta vulnerabilidad social y estrés climático, es decir, los territorios con mayor riesgo estructural.',
  },
  {
    q: '¿Para qué sirve el Índice Triangulado vs. el Riesgo Compuesto?',
    r: 'El Riesgo Compuesto solo usa eventos UNGRD (retrocompatible con versiones anteriores). El Índice Triangulado añade las dimensiones de pobreza e temperatura, lo que lo hace más pertinente para priorización de política pública o investigación sobre adaptación al cambio climático.',
  },
  {
    q: '¿Por qué solo 187 municipios tienen temperatura directa y el resto es imputado?',
    r: 'Las Normales Climatológicas del IDEAM solo cubren municipios con al menos una estación meteorológica activa. Los 920 municipios restantes se imputan con la media nacional de las estaciones disponibles (~22 °C). Esto subestima el estrés térmico en zonas cálidas sin estación — una limitación metodológica explícita.',
  },
  {
    q: '¿Por qué el IPM solo cubre 1079 de 1122 municipios?',
    r: 'El Censo DANE 2018 reporta 1122 municipios pero 43 tienen datos suprimidos o combinados (municipios con menos de 50 hogares censados). Para estos, el idx_ipm queda en 0 y el nivel en "Sin datos".',
  },
  {
    q: '¿Qué significan los niveles Bajo / Medio / Alto / Muy Alto?',
    r: 'Son umbrales fijos sobre la escala 0–5: 0 = Sin datos, 0.01–1.0 = Bajo, 1.01–2.5 = Medio, 2.51–4.0 = Alto, >4.0 = Muy Alto. Los mismos umbrales se aplican a todos los índices para facilitar la comparación entre dimensiones.',
  },
  {
    q: '¿Cómo citar esta herramienta?',
    r: 'Los datos primarios deben citarse en sus fuentes originales: UNGRD (datos.gov.co), DANE Censo 2018, IDEAM Normales Climatológicas. La metodología de integración y el código fuente se pueden referenciar directamente desde el repositorio GitHub del proyecto.',
  },
]

const FLUJO = [
  { paso: '1', label: 'Descarga', detalle: '03_descargar_fuentes.py', desc: 'IPM DANE + Temperatura IDEAM' },
  { paso: '2', label: 'Procesa', detalle: '01_procesar_datos.py', desc: 'Normaliza, pondera, calcula idx_triangulado' },
  { paso: '3', label: 'Exporta', detalle: '02_generar_estaticos.py', desc: 'Genera JSON estáticos para Vercel' },
  { paso: '4', label: 'Visualiza', detalle: 'React + D3.js', desc: 'Mapa interactivo, filtros, fichas' },
]

// ── Subcomponentes ────────────────────────────────────────────────────────────

function Collapsible({ title, Icon: IconComp, children, defaultOpen = false, accentColor }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      border: `1px solid ${open ? accentColor + '44' : 'var(--border)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: open ? `${accentColor}0d` : 'var(--bg-elevated)',
          border: 'none',
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {IconComp && <IconComp size={15} strokeWidth={1.5} color={open ? accentColor : 'var(--text-muted)'} />}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: open ? accentColor : 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
          {title}
        </span>
        {open
          ? <ChevronDown size={14} color="var(--text-muted)" />
          : <ChevronRight size={14} color="var(--text-muted)" />}
      </button>
      {open && (
        <div style={{ padding: '12px 14px 14px', background: 'var(--bg-surface)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Pill({ label, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      fontFamily: 'var(--font-sans)',
    }}>{label}</span>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DocumentacionModal({ open, onClose }) {
  const [seccion, setSeccion] = useState('metodologia')

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720,
          maxHeight: '90vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'var(--bg-elevated)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Triangle size={18} strokeWidth={1.5} color="var(--text-secondary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Índice de Riesgo Climático Triangulado
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Documentación metodológica · Colombia 1122 municipios · v2.0
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 6px', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            }}
          ><X size={14} /></button>
        </div>

        {/* Tabs de sección */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          flexShrink: 0, overflowX: 'auto',
        }}>
          {[
            { id: 'metodologia', label: 'Metodología', Icon: Ruler },
            { id: 'fuentes',     label: 'Fuentes',     Icon: Database },
            { id: 'faq',         label: 'Preguntas',   Icon: HelpCircle },
            { id: 'tecnico',     label: 'Técnico',     Icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSeccion(tab.id)}
              style={{
                padding: '9px 16px',
                background: 'none',
                border: 'none',
                borderBottom: seccion === tab.id ? '2px solid var(--selected-indicator)' : '2px solid transparent',
                color: seccion === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              <tab.Icon size={13} strokeWidth={1.5} />{tab.label}
            </button>
          ))}
        </div>

        {/* Contenido scrollable */}
        <div style={{ overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── METODOLOGÍA ── */}
          {seccion === 'metodologia' && (
            <>
              {/* Fórmula */}
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
                  FÓRMULA DEL ÍNDICE TRIANGULADO
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 2 }}>
                  <span style={{ color: '#b4a070' }}>idx_triangulado</span> =<br />
                  &nbsp;&nbsp;<span style={{ color: '#9cac8b' }}>idx_inundacion</span>    × <strong>0.20</strong> ─┐<br />
                  &nbsp;&nbsp;<span style={{ color: '#9cac8b' }}>idx_deslizamiento</span> × <strong>0.20</strong> &nbsp;├─ Amenaza UNGRD (<strong>55%</strong>)<br />
                  &nbsp;&nbsp;<span style={{ color: '#9cac8b' }}>idx_incendio</span>      × <strong>0.10</strong> &nbsp;│<br />
                  &nbsp;&nbsp;<span style={{ color: '#9cac8b' }}>idx_evento_extremo</span>× <strong>0.05</strong> ─┘<br />
                  &nbsp;&nbsp;<span style={{ color: '#808070' }}>idx_ipm</span>           × <strong>0.30</strong> ── Vulnerabilidad DANE (<strong>30%</strong>)<br />
                  &nbsp;&nbsp;<span style={{ color: '#eebd7b' }}>idx_temperatura</span>   × <strong>0.15</strong> ── Estrés Térmico IDEAM (<strong>15%</strong>)
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                  Todos los índices en escala <strong style={{ color: 'var(--text-secondary)' }}>0 – 5</strong>.
                  Resultado final: 0 = sin riesgo identificado, 5 = máximo riesgo.
                </div>
              </div>

              {/* Niveles */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>
                  UMBRALES DE NIVEL
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { nivel: 'Sin datos', rango: '= 0', color: '#374151' },
                    { nivel: 'Bajo',      rango: '0.01 – 1.0', color: '#16a34a' },
                    { nivel: 'Medio',     rango: '1.01 – 2.5', color: '#d97706' },
                    { nivel: 'Alto',      rango: '2.51 – 4.0', color: '#ea580c' },
                    { nivel: 'Muy Alto',  rango: '> 4.0',      color: '#dc2626' },
                  ].map(n => (
                    <div key={n.nivel} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: n.color + '18', border: `1px solid ${n.color}44`,
                      borderRadius: 8, padding: '5px 10px',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: n.color }}>{n.nivel}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.rango}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimensiones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.5 }}>
                  DIMENSIONES
                </div>
                {DIMENSIONES.map(dim => (
                  <Collapsible
                    key={dim.id}
                    Icon={dim.Icon}
                    title={`${dim.titulo} — peso ${dim.peso}`}
                    accentColor={dim.color}
                    defaultOpen={dim.id === 'amenaza'}
                  >
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
                      {dim.descripcion}
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr>
                          {['Indicador', 'Peso', 'Campo', 'Incluye'].map(h => (
                            <th key={h} style={{ textAlign: 'left', color: 'var(--text-muted)', padding: '4px 8px 4px 0', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dim.indicadores.map((ind, i) => (
                          <tr key={i}>
                            <td style={{ padding: '5px 8px 5px 0', color: 'var(--text-primary)', fontWeight: 500 }}>{ind.nombre}</td>
                            <td style={{ padding: '5px 8px 5px 0' }}><Pill label={ind.peso} color={dim.color} /></td>
                            <td style={{ padding: '5px 8px 5px 0', fontFamily: 'var(--font-mono)', color: dim.color, fontSize: 10 }}>{ind.campo}</td>
                            <td style={{ padding: '5px 0', color: 'var(--text-muted)', lineHeight: 1.4 }}>{ind.incluye}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {dim.nota && (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: dim.color + '0d', borderLeft: `2px solid ${dim.color}66`, borderRadius: '0 6px 6px 0', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {dim.nota}
                      </div>
                    )}
                  </Collapsible>
                ))}
              </div>
            </>
          )}

          {/* ── FUENTES ── */}
          {seccion === 'fuentes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  sigla: 'UNGRD',
                  nombre: 'Unidad Nacional para la Gestión del Riesgo de Desastres',
                  dataset: 'Emergencias y desastres — datos.gov.co',
                  id: 'wwkg-r6te',
                  cobertura: '22.945 eventos 2019–2026',
                  variables: 'Tipo de evento, DIVIPOLA, municipio, departamento, fecha',
                  color: '#9c9483',
                  Icon: Zap,
                  limitacion: 'Solo registra eventos reportados al sistema. Municipios sin reporte pueden tener exposición real no capturada.',
                },
                {
                  sigla: 'DANE',
                  nombre: 'Departamento Administrativo Nacional de Estadística',
                  dataset: 'IPM Censal 2018 — Pobreza Multidimensional Municipal',
                  id: 'Hoja: 4_IPM Mpio dominios',
                  cobertura: '1122 municipios (43 con datos suprimidos)',
                  variables: 'DIVIPOLA, IPM Total, IPM Cabecera, IPM Rural',
                  color: '#808070',
                  Icon: Users,
                  limitacion: 'Dato puntual del Censo 2018 — no refleja cambios por ETCR, pandemia ni inversión posterior.',
                },
                {
                  sigla: 'IDEAM',
                  nombre: 'Instituto de Hidrología, Meteorología y Estudios Ambientales',
                  dataset: 'Normales Climatológicas de Colombia',
                  id: 'nsz2-kzcq (datos.gov.co)',
                  cobertura: '356 municipios con estaciones activas',
                  variables: 'Municipio, departamento, temperatura media anual (°C)',
                  color: '#c07040',
                  Icon: Thermometer,
                  limitacion: '766 municipios sin estación → imputados con media nacional. Sesgo importante en regiones de variabilidad altitudinal alta.',
                },
              ].map(f => (
                <div key={f.sigla} style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${f.color}33`,
                  borderRadius: 10, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <f.Icon size={18} strokeWidth={1.5} color={f.color} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: f.color }}>{f.sigla}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.nombre}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Dataset</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{f.dataset}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>ID / Hoja</span>
                      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{f.id}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Cobertura</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{f.cobertura}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Variables</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{f.variables}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, padding: '7px 10px', background: 'var(--bg-surface)', borderLeft: '2px solid var(--border-strong)', borderRadius: '0 6px 6px 0', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>Limitación: </strong>{f.limitacion}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── FAQ ── */}
          {seccion === 'faq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PREGUNTAS.map((item, i) => (
                <Collapsible
                  key={i}
                  Icon={HelpCircle}
                  title={item.q}
                  accentColor="var(--text-secondary)"
                  defaultOpen={i === 0}
                >
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                    {item.r}
                  </p>
                </Collapsible>
              ))}
            </div>
          )}

          {/* ── TÉCNICO ── */}
          {seccion === 'tecnico' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Flujo de datos */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>
                  FLUJO DE PROCESAMIENTO
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {FLUJO.map((paso, i) => (
                    <>
                      <div key={paso.paso} style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 8, padding: '8px 12px',
                        minWidth: 120, flex: '1 1 120px',
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginBottom: 2 }}>Paso {paso.paso}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{paso.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', margin: '2px 0' }}>{paso.detalle}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{paso.desc}</div>
                      </div>
                      {i < FLUJO.length - 1 && (
                        <span key={`arr-${i}`} style={{ color: 'var(--text-disabled)', fontSize: 18 }}>→</span>
                      )}
                    </>
                  ))}
                </div>
              </div>

              {/* Stack tecnológico */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>
                  STACK TECNOLÓGICO
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {[
                    { capa: 'Backend procesamiento', tecnologias: 'Python 3 · pandas · geopandas · requests', color: '#9c9483' },
                    { capa: 'Frontend',               tecnologias: 'React · Vite · D3.js · Recharts · Lucide', color: '#9cac8b' },
                    { capa: 'Despliegue',              tecnologias: 'Vercel · archivos estáticos (sin backend)', color: '#808070' },
                    { capa: 'Datos estáticos',         tecnologias: 'GeoJSON · JSON por municipio (1105 series)', color: '#bd7341' },
                  ].map(t => (
                    <div key={t.capa} style={{
                      background: 'var(--bg-elevated)', border: `1px solid ${t.color}33`,
                      borderRadius: 8, padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: 10, color: t.color, fontWeight: 700, marginBottom: 4 }}>{t.capa.toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.tecnologias}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Archivos clave */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>
                  ARCHIVOS CLAVE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { archivo: 'scripts/03_descargar_fuentes.py', desc: 'Descarga IPM DANE y temperatura IDEAM' },
                    { archivo: 'scripts/01_procesar_datos.py',    desc: 'Normaliza índices y calcula idx_triangulado' },
                    { archivo: 'scripts/02_generar_estaticos.py', desc: 'Exporta GeoJSON y series JSON para Vercel' },
                    { archivo: 'data/processed/ipm_municipios.csv',      desc: '1122 municipios con IPM Censo 2018' },
                    { archivo: 'data/processed/temperatura_normales.csv', desc: '356 estaciones IDEAM con temp. media anual' },
                    { archivo: 'frontend/public/data/municipios.geojson', desc: 'GeoJSON con todos los índices calculados' },
                  ].map(f => (
                    <div key={f.archivo} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <code style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', minWidth: 0, wordBreak: 'break-all', flex: '0 0 auto', maxWidth: '55%' }}>{f.archivo}</code>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota despliegue Vercel */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>Despliegue en Vercel: </strong>
                Seleccionar Framework Preset = <strong style={{ color: 'var(--text-primary)' }}>Other</strong> (no Flask, no Vite, no Next.js).
                 El archivo <code style={{ color: 'var(--text-secondary)' }}>vercel.json</code> ya define buildCommand, outputDirectory y rewrites.
                No se necesita ningún backend — todos los datos son archivos JSON estáticos en <code style={{ color: 'var(--text-secondary)' }}>frontend/public/data/</code>.
              </div>
            </div>
          )}

        </div>

        {/* Footer del modal */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-elevated)', flexShrink: 0,
          fontSize: 11, color: 'var(--text-disabled)',
        }}>
          <span>Fuentes: UNGRD · DANE Censo 2018 · IDEAM Normales Climatológicas</span>
          <span>Colombia · 1122 municipios · v2.0</span>
        </div>
      </div>
    </div>
  )
}
