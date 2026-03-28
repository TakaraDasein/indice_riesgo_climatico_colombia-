#!/usr/bin/env python3
"""
Script para pre-generar todos los JSON estáticos que necesita el frontend en Vercel.
Genera:
  frontend/public/data/municipios.geojson   — GeoJSON completo
  frontend/public/data/stats.json           — estadísticas generales
  frontend/public/data/departamentos.json   — lista de departamentos
  frontend/public/data/series/<cod>.json    — serie temporal por municipio
"""

import json
import csv
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
RAW_DIR = BASE_DIR / "data" / "raw"
PUBLIC_DATA = BASE_DIR / "frontend" / "public" / "data"
SERIES_DIR = PUBLIC_DATA / "series"

PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
SERIES_DIR.mkdir(parents=True, exist_ok=True)

TIPO_A_CAT = {
    "INUNDACION": "inundacion", "CRECIENTE SUBITA": "inundacion",
    "AVENIDA TORRENCIAL": "inundacion",
    "MOVIMIENTO EN MASA": "deslizamiento", "DESLIZAMIENTO": "deslizamiento",
    "INCENDIO DE COBERTURA VEGETAL": "incendio", "INCENDIO FORESTAL": "incendio",
    "SEQUIA": "sequia", "HELADA": "sequia",
    "VENDAVAL": "evento_extremo", "TEMPORAL": "evento_extremo",
    "GRANIZADA": "evento_extremo", "TORMENTA ELECTRICA": "evento_extremo",
    "OLEAJE": "evento_extremo", "EROSION": "deslizamiento",
    "EROSION COSTERA": "deslizamiento",
}

print("Cargando GeoJSON...")
with open(PROCESSED_DIR / "municipios_riesgo.geojson", encoding="utf-8") as f:
    geojson = json.load(f)

features = geojson["features"]
print(f"  {len(features)} municipios cargados")

# ── 1. municipios.geojson ────────────────────────────────────
out = PUBLIC_DATA / "municipios.geojson"
with open(out, "w", encoding="utf-8") as f:
    json.dump(geojson, f, ensure_ascii=False, separators=(",", ":"))
print(f"[OK] {out.name} ({out.stat().st_size / 1e6:.1f} MB)")

# ── 2. stats.json ────────────────────────────────────────────
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

stats = {
    "total_municipios": len(features),
    "niveles_riesgo": niveles,
    "top_municipios": top_municipios[:20],
    "con_datos": sum(1 for f in features if int(f.get("properties", {}).get("total_eventos") or 0) > 0),
}

out = PUBLIC_DATA / "stats.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(stats, f, ensure_ascii=False, separators=(",", ":"))
print(f"[OK] {out.name}")

# ── 3. departamentos.json ────────────────────────────────────
dptos = sorted(set(
    str(f.get("properties", {}).get("departamento", "")).strip()
    for f in features
    if f.get("properties", {}).get("departamento")
))

out = PUBLIC_DATA / "departamentos.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(dptos, f, ensure_ascii=False, separators=(",", ":"))
print(f"[OK] {out.name} ({len(dptos)} departamentos)")

# ── 4. series/<cod>.json ─────────────────────────────────────
print("Generando series temporales por municipio...")
csv_path = RAW_DIR / "ungrd_eventos.csv"

serie_por_municipio = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
cats = ["inundacion", "deslizamiento", "incendio", "sequia", "evento_extremo"]

with open(csv_path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        divipola = row.get("divipola", "")
        try:
            cod = str(int(float(divipola))).zfill(5)
        except (ValueError, TypeError):
            continue
        fecha = row.get("fecha", "") or ""
        anio = fecha[:4] if fecha else None
        if not anio or not anio.isdigit():
            continue
        evento = (row.get("evento") or "").strip().upper()
        cat = TIPO_A_CAT.get(evento)
        if cat:
            serie_por_municipio[cod][anio][cat] += 1

n = 0
for cod, anos in serie_por_municipio.items():
    result = []
    for anio in sorted(anos.keys()):
        entry = {"año": anio}
        entry.update({c: anos[anio].get(c, 0) for c in cats})
        entry["total"] = sum(anos[anio].values())
        result.append(entry)
    out = SERIES_DIR / f"{cod}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))
    n += 1

print(f"[OK] {n} series temporales generadas en {SERIES_DIR}")

print("\nTodo listo. Archivos en frontend/public/data/")
