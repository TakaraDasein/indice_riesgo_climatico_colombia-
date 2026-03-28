# Plataforma de Riesgos Climáticos — Colombia

Plataforma web interactiva para explorar los riesgos climáticos de los **1122 municipios de Colombia**, construida sobre datos públicos del UNGRD, IDEAM y DANE.

## Tipos de riesgo visualizados

| Riesgo | Fuente | Descripción |
|--------|--------|-------------|
| 🌊 Inundación | UNGRD | Inundaciones, crecientes súbitas, avenidas torrenciales |
| ⛰️ Deslizamiento | UNGRD | Movimientos en masa, deslizamientos, erosión |
| 🔥 Incendio Forestal | UNGRD | Incendios de cobertura vegetal |
| ☀️ Sequía | UNGRD / IDEAM | Sequías, heladas |
| 🌪️ Evento Extremo | UNGRD | Vendavales, temporales, granizadas |
| ⚡ Riesgo Compuesto | Calculado | Índice ponderado de todos los anteriores |

---

## Instalación y uso

### 1. Clonar / descargar el proyecto

```bash
cd riesgos-climaticos-colombia
```

### 2. Crear entorno virtual e instalar dependencias

```bash
python3 -m venv .venv
source .venv/bin/activate   # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Procesar los datos (solo la primera vez)

Este script descarga automáticamente:
- Shapefile de municipios (HDX/OCHA ~111 MB)
- Eventos de emergencias UNGRD 2019–2026 (API Socrata)

```bash
python scripts/01_procesar_datos.py
```

Tiempo estimado: 5–15 minutos dependiendo de tu conexión.  
Los datos quedan en `data/processed/municipios_riesgo.geojson`.

### 4. Iniciar el servidor

```bash
python app.py
```

Abre en tu navegador: **http://localhost:5050**

---

## Estructura del proyecto

```
riesgos-climaticos-colombia/
├── app.py                      # Servidor Flask
├── requirements.txt
├── data/
│   ├── raw/                    # Datos descargados (shapefile, CSV UNGRD)
│   └── processed/
│       ├── municipios_riesgo.geojson   # GeoJSON final para el mapa
│       └── riesgo_municipios.csv       # Tabla de riesgo por municipio
├── scripts/
│   └── 01_procesar_datos.py    # Descarga y procesa todos los datos
├── static/
│   ├── css/main.css
│   └── js/main.js
└── templates/
    └── index.html
```

---

## Fuentes de datos

| Fuente | Descripción | Acceso |
|--------|-------------|--------|
| [HDX/OCHA](https://data.humdata.org/dataset/cod-ab-col) | Shapefile municipios Colombia (ADM2) - DANE 2024 | Libre, sin registro |
| [UNGRD - datos.gov.co](https://www.datos.gov.co/resource/wwkg-r6te.json) | Registro histórico de eventos de emergencias 2019–2026 | API Socrata, libre |
| [IDEAM](https://www.ideam.gov.co) | Datos hidrometeorológicos y alertas | Requiere registro |
| [IGAC](https://www.igac.gov.co) | Cartografía oficial Colombia | Web |

---

## Cómo funciona el índice de riesgo

El índice compuesto se calcula como promedio ponderado de los 6 tipos de riesgo, normalizados al percentil 95 de cada categoría (escala 0–5):

```
Riesgo Compuesto = 0.25 × Inundación + 0.25 × Deslizamiento
                 + 0.20 × Incendio   + 0.15 × Evento Extremo
                 + 0.10 × Sequía     + 0.05 × Ola de Calor
```

**Clasificación:**
- 0: Sin datos
- 0.1–1.0: Bajo
- 1.1–2.5: Medio
- 2.6–4.0: Alto
- 4.1–5.0: Muy Alto

---

## Roadmap / mejoras pendientes

- [ ] Integrar datos de temperatura extrema (IDEAM / ERA5) para olas de calor
- [ ] Añadir índice IRCC del DNP (vulnerabilidad socioeconómica)
- [ ] Exportar ficha por municipio a PDF
- [ ] Añadir serie temporal de eventos por año
- [ ] Integrar alertas hidrologicas en tiempo real (IDEAM FEWS)
- [ ] Despliegue en la nube (Render / Railway)

---

## Tecnologías

- **Backend**: Python 3.11 + Flask
- **Procesamiento geoespacial**: GeoPandas, Fiona, Shapely
- **Mapa**: Leaflet.js 1.9.4
- **Tiles**: CartoDB Dark Matter
- **Datos**: Socrata API (datos.gov.co)
