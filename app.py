#!/usr/bin/env python3
"""
Servidor Flask para la plataforma de riesgos climáticos Colombia.
Sirve la API de datos y el frontend React (build de Vite).
"""

import json
import csv
from pathlib import Path
from collections import defaultdict
from flask import Flask, send_from_directory, jsonify, abort
from flask.wrappers import Response

BASE_DIR = Path(__file__).parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
RAW_DIR = BASE_DIR / "data" / "raw"
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

# Sirve el build de Vite si existe, sino fallback a templates/
if FRONTEND_DIST.exists():
    app = Flask(__name__, static_folder=str(FRONTEND_DIST), static_url_path="/")
else:
    app = Flask(
        __name__,
        template_folder=str(BASE_DIR / "templates"),
        static_folder=str(BASE_DIR / "static"),
    )

# Habilita CORS para desarrollo
@app.after_request
def add_cors(response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

# ── Cache en memoria ─────────────────────────────────────────
_geojson_cache = None
_ungrd_cache = None


def cargar_geojson():
    global _geojson_cache
    if _geojson_cache is None:
        geojson_path = PROCESSED_DIR / "municipios_riesgo.geojson"
        if not geojson_path.exists():
            raise FileNotFoundError(
                "GeoJSON no encontrado. Ejecuta: python scripts/01_procesar_datos.py"
            )
        with open(geojson_path, "r", encoding="utf-8") as f:
            _geojson_cache = json.load(f)
        print(f"[OK] GeoJSON cargado: {len(_geojson_cache['features'])} municipios")
    return _geojson_cache


def cargar_ungrd() -> list:
    """Carga el CSV de eventos UNGRD para la serie temporal."""
    global _ungrd_cache
    if _ungrd_cache is None:
        csv_path = RAW_DIR / "ungrd_eventos.csv"
        if not csv_path.exists():
            return []
        rows = []
        with open(csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
        _ungrd_cache = rows
    return _ungrd_cache


# ── Rutas principales ─────────────────────────────────────────

@app.route("/")
def index():
    if FRONTEND_DIST.exists():
        return send_from_directory(str(FRONTEND_DIST), "index.html")
    from flask import render_template
    return render_template("index.html")


@app.route("/<path:path>")
def serve_static(path):
    """Sirve assets del build de Vite."""
    if FRONTEND_DIST.exists():
        full = FRONTEND_DIST / path
        if full.exists():
            return send_from_directory(str(FRONTEND_DIST), path)
    # fallback al index (SPA routing)
    if FRONTEND_DIST.exists():
        return send_from_directory(str(FRONTEND_DIST), "index.html")
    abort(404)


# ── API de datos ─────────────────────────────────────────────

@app.route("/api/municipios")
def api_municipios():
    """GeoJSON completo de municipios con datos de riesgo."""
    return jsonify(cargar_geojson())


@app.route("/api/municipio/<cod>")
def api_municipio(cod):
    """Datos de un municipio por código DIVIPOLA."""
    geojson = cargar_geojson()
    for feature in geojson["features"]:
        props = feature.get("properties", {})
        cod_prop = str(props.get("cod_municipio", "")).zfill(5)
        if cod_prop == str(cod).zfill(5):
            return jsonify({"ok": True, "data": props})
    return jsonify({"ok": False, "error": "Municipio no encontrado"}), 404


@app.route("/api/municipio/<cod>/serie-temporal")
def api_serie_temporal(cod):
    """Serie temporal de eventos por año para un municipio."""
    eventos = cargar_ungrd()
    cod_norm = str(cod).zfill(5)

    TIPO_A_CAT = {
        "INUNDACION": "inundacion", "CRECIENTE SUBITA": "inundacion",
        "AVENIDA TORRENCIAL": "inundacion",
        "MOVIMIENTO EN MASA": "deslizamiento", "DESLIZAMIENTO": "deslizamiento",
        "INCENDIO DE COBERTURA VEGETAL": "incendio", "INCENDIO FORESTAL": "incendio",
        "SEQUIA": "sequia", "HELADA": "sequia",
        "VENDAVAL": "evento_extremo", "TEMPORAL": "evento_extremo",
        "GRANIZADA": "evento_extremo",
    }

    serie: dict = defaultdict(lambda: defaultdict(int))

    for row in eventos:
        divipola = row.get("divipola", "")
        try:
            cod_row = str(int(float(divipola))).zfill(5)
        except (ValueError, TypeError):
            continue
        if cod_row != cod_norm:
            continue
        fecha = row.get("fecha", "") or ""
        anio = fecha[:4] if fecha else None
        if not anio or not anio.isdigit():
            continue
        evento = (row.get("evento") or "").strip().upper()
        cat = TIPO_A_CAT.get(evento, "otro")
        serie[anio][cat] += 1

    # Convierte a lista ordenada
    result = []
    cats = ["inundacion", "deslizamiento", "incendio", "sequia", "evento_extremo"]
    for anio in sorted(serie.keys()):
        entry = {"año": anio}
        entry.update({c: serie[anio].get(c, 0) for c in cats})
        entry["total"] = sum(serie[anio].values())
        result.append(entry)

    return jsonify(result)


@app.route("/api/stats")
def api_stats():
    """Estadísticas generales del dataset."""
    geojson = cargar_geojson()
    features = geojson["features"]
    total = len(features)

    niveles = {"Sin datos": 0, "Bajo": 0, "Medio": 0, "Alto": 0, "Muy Alto": 0}
    top_municipios = []

    for f in features:
        p = f.get("properties", {})
        nivel = p.get("nivel_riesgo_compuesto", "Sin datos")
        niveles[nivel] = niveles.get(nivel, 0) + 1
        total_ev = int(p.get("total_eventos") or 0)
        if total_ev > 0:
            top_municipios.append({
                "cod": p.get("cod_municipio"),
                "nombre": p.get("municipio", ""),
                "departamento": p.get("departamento", ""),
                "total_eventos": total_ev,
                "idx_riesgo_compuesto": float(p.get("idx_riesgo_compuesto") or 0),
                "nivel": nivel,
            })

    top_municipios.sort(key=lambda x: x["total_eventos"], reverse=True)

    return jsonify({
        "total_municipios": total,
        "niveles_riesgo": niveles,
        "top_municipios": top_municipios[:20],
        "con_datos": sum(1 for f in features if int(f.get("properties", {}).get("total_eventos") or 0) > 0),
    })


@app.route("/api/departamentos")
def api_departamentos():
    """Lista de departamentos únicos."""
    geojson = cargar_geojson()
    dptos = set()
    for f in geojson["features"]:
        d = f.get("properties", {}).get("departamento")
        if d:
            dptos.add(str(d).strip())
    return jsonify(sorted(dptos))


@app.route("/api/departamento/<nombre>/stats")
def api_departamento_stats(nombre):
    """Estadísticas de un departamento específico."""
    geojson = cargar_geojson()
    munis = [
        f["properties"] for f in geojson["features"]
        if (f.get("properties", {}).get("departamento") or "").strip().lower() == nombre.strip().lower()
    ]
    if not munis:
        return jsonify({"ok": False, "error": "Departamento no encontrado"}), 404

    cats = ["inundacion", "deslizamiento", "incendio", "sequia", "evento_extremo"]
    totales = {c: sum(int(m.get(c) or 0) for m in munis) for c in cats}
    avg_idx = {
        k: round(sum(float(m.get(f"idx_{k}") or 0) for m in munis) / len(munis), 2)
        for k in cats
    }

    return jsonify({
        "departamento": nombre,
        "total_municipios": len(munis),
        "totales_por_tipo": totales,
        "promedio_idx": avg_idx,
        "top_municipios": sorted(munis, key=lambda x: float(x.get("idx_riesgo_compuesto") or 0), reverse=True)[:5],
    })


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("PLATAFORMA DE RIESGOS CLIMATICOS — COLOMBIA")
    print("=" * 60)
    mode = "React (Vite)" if FRONTEND_DIST.exists() else "Leaflet (legacy)"
    print(f"Frontend: {mode}")
    print("URL: http://localhost:5050")
    print("Ctrl+C para detener\n")
    app.run(debug=True, host="0.0.0.0", port=5050)

