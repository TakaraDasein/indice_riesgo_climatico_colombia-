#!/usr/bin/env python3
"""
Script 1: Descarga y procesa el shapefile de municipios de Colombia (HDX/OCHA)
y los datos de emergencias de UNGRD via Socrata API.

Fuentes:
- Municipios: https://data.humdata.org/dataset/cod-ab-col (HDX/OCHA/DANE)
- Emergencias: https://www.datos.gov.co/resource/wwkg-r6te.json (UNGRD)
"""

import os
import json
import zipfile
import requests
import pandas as pd
import geopandas as gpd
from pathlib import Path
from tqdm import tqdm

BASE_DIR = Path(__file__).parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────────
# 1. DESCARGA SHAPEFILE DE MUNICIPIOS (HDX/OCHA)
# ──────────────────────────────────────────────

MUNICIPIOS_ZIP_URL = (
    "https://data.humdata.org/dataset/50ea7fee-f9af-45a7-8a52-abb9c790a0b6"
    "/resource/32fba556-0109-4d1c-84cb-c8abddf7775b/download/"
    "col-administrative-divisions-shapefiles.zip"
)
MUNICIPIOS_ZIP_PATH = RAW_DIR / "col-admin-shapefiles.zip"
MUNICIPIOS_DIR = RAW_DIR / "shapefiles"


def download_file(url: str, dest: Path, desc: str = "Descargando"):
    """Descarga un archivo con barra de progreso."""
    if dest.exists():
        print(f"[OK] Ya existe: {dest.name}")
        return
    print(f"Descargando {desc}...")
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()
    total = int(r.headers.get("content-length", 0))
    with open(dest, "wb") as f, tqdm(
        total=total, unit="B", unit_scale=True, desc=dest.name
    ) as bar:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
            bar.update(len(chunk))
    print(f"[OK] Guardado en {dest}")


def cargar_municipios() -> gpd.GeoDataFrame:
    """Descarga y carga el shapefile de municipios nivel ADM2."""
    # Descarga el ZIP
    download_file(MUNICIPIOS_ZIP_URL, MUNICIPIOS_ZIP_PATH, "shapefile municipios Colombia")

    # Extrae
    if not MUNICIPIOS_DIR.exists():
        print("Extrayendo ZIP...")
        with zipfile.ZipFile(MUNICIPIOS_ZIP_PATH, "r") as z:
            z.extractall(MUNICIPIOS_DIR)
        print(f"[OK] Extraido en {MUNICIPIOS_DIR}")

    # Busca el shapefile ADM2 (municipios)
    shps = list(MUNICIPIOS_DIR.rglob("*adm2*.shp"))
    if not shps:
        # Fallback: busca cualquier shapefile que contenga 'mun' o 'municipio'
        shps = list(MUNICIPIOS_DIR.rglob("*.shp"))
        # Filtra el nivel 2
        shps = [s for s in shps if "adm2" in s.name.lower() or "level2" in s.name.lower() or "municipio" in s.name.lower()]

    if not shps:
        shps = list(MUNICIPIOS_DIR.rglob("*.shp"))
        print(f"Shapefiles encontrados: {[s.name for s in shps]}")
        # Usa el primero que no sea nivel 0 ni nivel 1
        shps = [s for s in shps if "adm0" not in s.name.lower() and "adm1" not in s.name.lower() and "level0" not in s.name.lower() and "level1" not in s.name.lower() and "vereda" not in s.name.lower() and "seccion" not in s.name.lower()]

    if not shps:
        raise FileNotFoundError("No se encontro shapefile ADM2 de municipios.")

    shp_path = shps[0]
    print(f"Cargando shapefile: {shp_path.name}")
    gdf = gpd.read_file(shp_path)
    print(f"[OK] {len(gdf)} municipios cargados. Columnas: {list(gdf.columns)}")

    # Estandariza columnas
    col_map = {}
    for col in gdf.columns:
        cl = col.lower()
        if "pcode" in cl and "adm2" in cl:
            col_map[col] = "cod_mpio"
        elif cl in ("adm2_es", "adm2_name", "nombre", "municipio", "mpio"):
            col_map[col] = "municipio"
        elif "pcode" in cl and "adm1" in cl:
            col_map[col] = "cod_dpto"
        elif cl in ("adm1_es", "adm1_name", "departamento", "dpto"):
            col_map[col] = "departamento"

    gdf = gdf.rename(columns=col_map)

    # Reproyectar a WGS84 si es necesario
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    return gdf


# ──────────────────────────────────────────────
# 2. DESCARGA EVENTOS UNGRD (Socrata API)
# ──────────────────────────────────────────────

UNGRD_BASE = "https://www.datos.gov.co/resource/wwkg-r6te.json"

# Tipos de eventos que nos interesan y su categoria de riesgo
TIPO_A_RIESGO = {
    "INUNDACION": "inundacion",
    "CRECIENTE SUBITA": "inundacion",
    "AVENIDA TORRENCIAL": "inundacion",
    "MOVIMIENTO EN MASA": "deslizamiento",
    "DESLIZAMIENTO": "deslizamiento",
    "INCENDIO DE COBERTURA VEGETAL": "incendio",
    "INCENDIO FORESTAL": "incendio",
    "SEQUIA": "sequia",
    "HELADA": "sequia",
    "VENDAVAL": "evento_extremo",
    "TEMPORAL": "evento_extremo",
    "GRANIZADA": "evento_extremo",
    "TORMENTA ELECTRICA": "evento_extremo",
    "OLEAJE": "evento_extremo",
    "EROSION": "deslizamiento",
    "EROSION COSTERA": "deslizamiento",
}


def descargar_ungrd_eventos() -> pd.DataFrame:
    """Descarga todos los eventos de emergencias UNGRD via Socrata paginando.
    Descarga SIN filtro de tipo para evitar el 400 por $where complejo,
    luego filtra localmente por tipo de evento relevante.
    """
    cache_path = RAW_DIR / "ungrd_eventos.csv"
    if cache_path.exists():
        print(f"[OK] Usando cache UNGRD: {cache_path.name}")
        return pd.read_csv(cache_path)

    print("Descargando eventos UNGRD (puede tomar unos minutos)...")
    all_rows = []
    limit = 5000
    offset = 0

    while True:
        params = {
            "$limit": limit,
            "$offset": offset,
            "$select": "evento,divipola,municipio,departamento,fecha",
        }
        r = requests.get(UNGRD_BASE, params=params, timeout=60)
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        all_rows.extend(batch)
        offset += limit
        print(f"  Descargados {len(all_rows)} eventos...")
        if len(batch) < limit:
            break

    df = pd.DataFrame(all_rows)

    # Filtra localmente por los tipos de evento de interes
    if "evento" in df.columns:
        tipos_validos = set(TIPO_A_RIESGO.keys())
        df = df[df["evento"].str.strip().str.upper().isin(tipos_validos)].copy()

    df.to_csv(cache_path, index=False)
    print(f"[OK] {len(df)} eventos relevantes UNGRD guardados en {cache_path.name}")
    return df


def agregar_eventos_por_municipio(df_eventos: pd.DataFrame) -> pd.DataFrame:
    """
    Agrega eventos por municipio y categoria de riesgo.
    Retorna un DataFrame con columnas: cod_municipio, inundacion, deslizamiento,
    incendio, sequia, evento_extremo, total_eventos
    """
    # Mapea tipo de evento a categoria de riesgo
    df = df_eventos.copy()
    df["evento"] = df["evento"].str.strip().str.upper()
    df["categoria"] = df["evento"].map(TIPO_A_RIESGO)

    # La columna de codigo municipio en UNGRD se llama 'divipola' y es float
    cod_col = "divipola" if "divipola" in df.columns else "cod_municipio"
    df = df.dropna(subset=["categoria", cod_col])

    # Convierte divipola float->int->str y rellena con ceros a 5 digitos
    df["cod_municipio"] = df[cod_col].apply(
        lambda x: str(int(float(x))).zfill(5) if pd.notna(x) else None
    )

    # Pivote: conteo por municipio y categoria
    pivot = (
        df.groupby(["cod_municipio", "categoria"])
        .size()
        .unstack(fill_value=0)
        .reset_index()
    )

    # Asegura que todas las categorias existan
    for cat in ["inundacion", "deslizamiento", "incendio", "sequia", "evento_extremo"]:
        if cat not in pivot.columns:
            pivot[cat] = 0

    pivot["total_eventos"] = pivot[["inundacion", "deslizamiento", "incendio", "sequia", "evento_extremo"]].sum(axis=1)

    # Añade nombre de municipio y departamento (el mas frecuente por codigo)
    nombres = (
        df[["cod_municipio", "municipio", "departamento"]]
        .dropna()
        .drop_duplicates(subset=["cod_municipio"])
        .reset_index(drop=True)
    )
    pivot = pivot.merge(nombres, on="cod_municipio", how="left")

    return pivot


# ──────────────────────────────────────────────
# 3. NORMALIZA INDICES DE RIESGO (0-5)
# ──────────────────────────────────────────────

def normalizar_riesgo(serie: pd.Series, max_val: float = None) -> pd.Series:
    """Normaliza una serie de conteos a escala 0-5."""
    if max_val is None:
        max_val = serie.quantile(0.95)  # usa percentil 95 para evitar outliers extremos
    if max_val == 0:
        return pd.Series([0.0] * len(serie), index=serie.index)
    return (serie.clip(0, max_val) / max_val * 5).round(1)


def calcular_nivel(valor: float) -> str:
    """Convierte un valor 0-5 a nivel de riesgo textual."""
    if valor == 0:
        return "Sin datos"
    elif valor <= 1:
        return "Bajo"
    elif valor <= 2.5:
        return "Medio"
    elif valor <= 4:
        return "Alto"
    else:
        return "Muy Alto"


# ──────────────────────────────────────────────
# 4. PROCESO PRINCIPAL
# ──────────────────────────────────────────────

def main():
    print("=" * 60)
    print("PROCESANDO DATOS DE RIESGO CLIMATICO - COLOMBIA")
    print("=" * 60)

    # Carga municipios
    print("\n[1/4] Cargando shapefile de municipios...")
    gdf = cargar_municipios()

    # Descarga y procesa eventos UNGRD
    print("\n[2/4] Descargando eventos de emergencias (UNGRD)...")
    df_eventos = descargar_ungrd_eventos()

    print("\n[3/4] Agregando eventos por municipio...")
    df_riesgo = agregar_eventos_por_municipio(df_eventos)

    # Normaliza indices
    for cat in ["inundacion", "deslizamiento", "incendio", "sequia", "evento_extremo"]:
        df_riesgo[f"idx_{cat}"] = normalizar_riesgo(df_riesgo[cat])

    df_riesgo["idx_ola_calor"] = 0.0  # Placeholder hasta tener datos IDEAM temperatura

    # Calcula indice compuesto de riesgo (promedio ponderado)
    pesos = {
        "idx_inundacion": 0.25,
        "idx_deslizamiento": 0.25,
        "idx_incendio": 0.20,
        "idx_evento_extremo": 0.15,
        "idx_sequia": 0.10,
        "idx_ola_calor": 0.05,
    }
    df_riesgo["idx_riesgo_compuesto"] = sum(
        df_riesgo[col] * peso for col, peso in pesos.items()
    ).round(2)

    # Añade niveles textuales
    for cat in ["inundacion", "deslizamiento", "incendio", "sequia", "evento_extremo", "ola_calor", "riesgo_compuesto"]:
        df_riesgo[f"nivel_{cat}"] = df_riesgo[f"idx_{cat}"].apply(calcular_nivel)

    # ──────────────────────────────────────────────
    # 4. Une con geometrias y exporta GeoJSON
    # ──────────────────────────────────────────────
    print("\n[4/4] Generando GeoJSON para el mapa...")

    # Unifica codigo municipio
    # Normaliza nombres de columna a minusculas para busqueda robusta
    gdf.columns = [c.lower() for c in gdf.columns]

    if "cod_mpio" in gdf.columns:
        gdf["cod_municipio"] = gdf["cod_mpio"].astype(str).str.strip().str.zfill(5)
    elif "adm2_pcode" in gdf.columns:
        # El pcode de OCHA para Colombia tiene formato 'CO' + 5 digitos, ej: CO05001
        # Removemos el prefijo de pais (cualquier letra al inicio)
        gdf["cod_municipio"] = (
            gdf["adm2_pcode"].astype(str)
            .str.replace(r"^[A-Za-z]+", "", regex=True)
            .str.strip()
            .str.zfill(5)
        )
    else:
        # Intenta detectar la columna de codigo
        for col in gdf.columns:
            if gdf[col].astype(str).str.match(r"^\d{5}$").sum() > 100:
                gdf["cod_municipio"] = gdf[col].astype(str).str.zfill(5)
                break

    # Asegura nombres de municipio y departamento desde el shapefile
    if "adm2_es" in gdf.columns and "municipio" not in gdf.columns:
        gdf["municipio"] = gdf["adm2_es"]
    if "adm1_es" in gdf.columns and "departamento" not in gdf.columns:
        gdf["departamento"] = gdf["adm1_es"]

    # Normaliza cod_municipio en df_riesgo a string 5 digitos con ceros
    df_riesgo["cod_municipio"] = df_riesgo["cod_municipio"].apply(
        lambda x: str(int(float(x))).zfill(5) if pd.notna(x) else None
    )

    # Guarda CSV de riesgo (con codigos normalizados)
    riesgo_csv = PROCESSED_DIR / "riesgo_municipios.csv"
    df_riesgo.to_csv(riesgo_csv, index=False)
    print(f"[OK] CSV de riesgo: {riesgo_csv}")

    # Merge
    gdf_merge = gdf.merge(df_riesgo, on="cod_municipio", how="left")

    # Rellena NaN con 0 en indices
    idx_cols = [c for c in gdf_merge.columns if c.startswith("idx_")]
    nivel_cols = [c for c in gdf_merge.columns if c.startswith("nivel_")]
    for col in idx_cols:
        gdf_merge[col] = gdf_merge[col].fillna(0)
    for col in nivel_cols:
        gdf_merge[col] = gdf_merge[col].fillna("Sin datos")

    # Asegura nombre de municipio y departamento
    if "municipio_y" in gdf_merge.columns:
        gdf_merge["municipio"] = gdf_merge["municipio_y"].fillna(gdf_merge.get("municipio_x", ""))
    if "departamento_y" in gdf_merge.columns:
        gdf_merge["departamento"] = gdf_merge["departamento_y"].fillna(gdf_merge.get("departamento_x", ""))

    # Simplifica geometria para reducir tamano del archivo
    gdf_merge["geometry"] = gdf_merge["geometry"].simplify(0.01, preserve_topology=True)

    # Selecciona columnas finales
    keep_cols = [
        "cod_municipio", "municipio", "departamento",
        "inundacion", "deslizamiento", "incendio", "sequia", "evento_extremo",
        "total_eventos",
        "idx_inundacion", "idx_deslizamiento", "idx_incendio",
        "idx_sequia", "idx_evento_extremo", "idx_ola_calor",
        "idx_riesgo_compuesto",
        "nivel_inundacion", "nivel_deslizamiento", "nivel_incendio",
        "nivel_sequia", "nivel_evento_extremo", "nivel_ola_calor",
        "nivel_riesgo_compuesto",
        "geometry"
    ]
    keep_cols = [c for c in keep_cols if c in gdf_merge.columns]
    gdf_final = gdf_merge[keep_cols]

    # Exporta GeoJSON
    geojson_path = PROCESSED_DIR / "municipios_riesgo.geojson"
    gdf_final.to_file(geojson_path, driver="GeoJSON")
    print(f"[OK] GeoJSON exportado: {geojson_path} ({geojson_path.stat().st_size / 1e6:.1f} MB)")

    # Estadisticas finales
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Municipios totales en mapa: {len(gdf_final)}")
    print(f"Municipios con datos de riesgo: {(gdf_final['total_eventos'] > 0).sum() if 'total_eventos' in gdf_final.columns else 'N/A'}")
    print("\nDistribucion de riesgo compuesto:")
    if "nivel_riesgo_compuesto" in gdf_final.columns:
        print(gdf_final["nivel_riesgo_compuesto"].value_counts().to_string())
    print("\nProcesamiento completado exitosamente.")


if __name__ == "__main__":
    main()
