#!/usr/bin/env python3
"""
Script 3: Descarga y procesa fuentes adicionales para el Índice Triangulado.

Fuentes:
  1. IPM Censal 2018 (DANE) — Índice de Pobreza Multidimensional por municipio
     Publicado en: https://www.dane.gov.co (archivo XLS de resultados del Censo 2018)

  2. Temperatura media del aire (IDEAM) — Dataset sbwg-7ju4 en datos.gov.co
     Datos horarios por estación meteorológica. Se agrega temperatura media por municipio.

Salida:
  data/processed/ipm_municipios.csv    → IPM por municipio (cod_municipio, ipm, ...)
  data/processed/temperatura_municipios.csv → Temperatura media por municipio
"""

import io
import time
import requests
import numpy as np
import pandas as pd
from pathlib import Path
from unicodedata import normalize

BASE_DIR = Path(__file__).parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────────────────────

def normalizar_texto(s: str) -> str:
    """Elimina tildes, convierte a mayúsculas y quita espacios extra."""
    if not isinstance(s, str):
        return ""
    s = normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return s.upper().strip()


# ─────────────────────────────────────────────────────────
# 1. IPM CENSAL 2018 (DANE)
# ─────────────────────────────────────────────────────────
# El DANE publica los resultados del IPM censal 2018 en su página oficial.
# La URL exacta del archivo XLS puede cambiar con cada actualización.
# Usamos la URL del archivo de "Medida de Pobreza Multidimensional Municipal 2018".

IPM_URLS = [
    # URL primaria (publicación 2020 - resultados censales)
    "https://www.dane.gov.co/files/investigaciones/condiciones_vida/pobreza/2020/"
    "Anexo-IPM-Censal-Cabecera-CentroP-Rural-Disperso-Municipios-departamentos.xls",
    # URL alternativa (publicación directa Censo 2018)
    "https://www.dane.gov.co/files/investigaciones/condiciones_vida/pobreza/2018/"
    "ipm-censal-2018/Anexo-IPM-Censal-Municipios.xlsx",
    # Tercer fallback
    "https://www.dane.gov.co/files/investigaciones/condiciones_vida/pobreza/2019/"
    "Anexo-IPM-censal-municipio.xls",
]

IPM_CACHE = RAW_DIR / "ipm_censal_2018.xlsx"


def descargar_ipm_dane() -> pd.DataFrame:
    """
    Descarga el archivo XLS del IPM Censal 2018 del DANE y extrae
    los valores a nivel municipal.

    Retorna DataFrame con columnas:
        cod_municipio (str 5 dígitos), ipm_total (float 0-100),
        ipm_cabecera, ipm_rural
    """
    if IPM_CACHE.exists():
        print(f"[OK] Cache IPM existe: {IPM_CACHE.name}")
    else:
        print("Descargando IPM Censal 2018 del DANE...")
        descargado = False
        for url in IPM_URLS:
            try:
                print(f"  Intentando: {url}")
                r = requests.get(url, timeout=60, verify=False,
                                 headers={"User-Agent": "Mozilla/5.0"})
                if r.status_code == 200 and len(r.content) > 10_000:
                    with open(IPM_CACHE, "wb") as f:
                        f.write(r.content)
                    print(f"  [OK] Descargado ({len(r.content)/1024:.0f} KB)")
                    descargado = True
                    break
                else:
                    print(f"  HTTP {r.status_code} o archivo muy pequeño, probando siguiente URL...")
            except Exception as e:
                print(f"  Error: {e}, probando siguiente URL...")
        if not descargado:
            print("\n[ADVERTENCIA] No se pudo descargar el IPM automáticamente.")
            print("Por favor descarga manualmente el archivo desde:")
            print("  https://www.dane.gov.co → Estadísticas → Pobreza y condiciones de vida → Pobreza multidimensional")
            print(f"  Guárdalo como: {IPM_CACHE}")
            return pd.DataFrame()

    # Leer el XLS/XLSX con pandas
    print("Procesando IPM Censal 2018...")
    try:
        # Probar diferentes hojas y filas de encabezado
        xls = pd.ExcelFile(IPM_CACHE)
        print(f"  Hojas disponibles: {xls.sheet_names}")

        df_raw = None
        # Buscar la hoja que tenga datos municipales (generalmente "Municipios" o la primera)
        for sheet in xls.sheet_names:
            if any(kw in sheet.upper() for kw in ["MUNIC", "TOTAL", "RESULT", "IPM", "DATOS"]):
                df_raw = pd.read_excel(IPM_CACHE, sheet_name=sheet, header=None)
                print(f"  Usando hoja: '{sheet}' — {len(df_raw)} filas")
                break
        if df_raw is None:
            df_raw = pd.read_excel(IPM_CACHE, sheet_name=0, header=None)
            print(f"  Usando hoja 0 — {len(df_raw)} filas")

        # Detectar fila del encabezado y columna de código DIVIPOLA
        header_row = None
        cod_col_idx = None

        for i, row in df_raw.iterrows():
            row_str = " ".join(str(v).upper() for v in row.values)
            if "DIVIPOLA" in row_str or ("CODIGO" in row_str and "MUNICIPIO" in row_str):
                header_row = i
                # Buscar columna con código
                for j, v in enumerate(row.values):
                    if "DIVIPOLA" in str(v).upper() or (
                        "CODIGO" in str(v).upper() and "MUN" in str(v).upper()
                    ):
                        cod_col_idx = j
                        break
                break

        if header_row is None:
            # Intento alternativo: buscar la primera fila con 5+ números de 5 dígitos en alguna columna
            for i, row in df_raw.iterrows():
                for j, v in enumerate(row.values):
                    try:
                        n = int(float(v))
                        if 1000 <= n <= 99999:
                            # Verificar que la columna tenga muchos valores de 5 dígitos
                            col_vals = df_raw.iloc[i:, j].apply(
                                lambda x: bool(str(int(float(x))).zfill(5).isdigit())
                                if pd.notna(x) else False
                            )
                            if col_vals.sum() > 50:
                                header_row = i - 1 if i > 0 else 0
                                cod_col_idx = j
                                break
                    except (ValueError, TypeError):
                        pass
                if cod_col_idx is not None:
                    break

        if header_row is None or cod_col_idx is None:
            print("  [ERROR] No se pudo detectar estructura del archivo IPM.")
            print("  Primeras filas del archivo:")
            print(df_raw.head(10).to_string())
            return pd.DataFrame()

        # Re-leer con el encabezado correcto
        df = pd.read_excel(IPM_CACHE, sheet_name=xls.sheet_names[0], header=header_row)
        df.columns = [str(c).strip().upper() for c in df.columns]
        print(f"  Columnas detectadas: {list(df.columns[:12])}")

        # Identificar columna código DIVIPOLA
        cod_candidates = [c for c in df.columns if "DIVIPOLA" in c or
                          ("COD" in c and "MUN" in c) or c in ("CODIGO", "CODMPIO")]
        ipm_candidates = [c for c in df.columns if "IPM" in c or "INCIDENCIA" in c or
                          "POBREZA" in c or "MULTIDIMENSIONAL" in c]
        mun_candidates = [c for c in df.columns if "MUNICIPIO" in c or "NOMBRE" in c]

        if not cod_candidates:
            print(f"  [ERROR] No se encontró columna de código DIVIPOLA. Columnas: {list(df.columns)}")
            return pd.DataFrame()

        cod_col = cod_candidates[0]

        # Filtrar filas con código de 5 dígitos válido
        def es_codigo_valido(v):
            try:
                n = int(float(v))
                return 1001 <= n <= 99999
            except (ValueError, TypeError):
                return False

        df = df[df[cod_col].apply(es_codigo_valido)].copy()
        df["cod_municipio"] = df[cod_col].apply(
            lambda x: str(int(float(x))).zfill(5)
        )

        print(f"  Municipios con código válido: {len(df)}")

        # Extraer columnas IPM
        # Buscar IPM total (cabecera + rural combinado, o total nacional)
        ipm_total_candidates = [c for c in ipm_candidates
                                 if "TOTAL" in c or "NACIONAL" in c or len(c) < 30]
        ipm_cab_candidates = [c for c in ipm_candidates if "CABECERA" in c or "CAB" in c]
        ipm_rural_candidates = [c for c in ipm_candidates
                                 if "RURAL" in c or "DISPERSO" in c or "CENTRO" in c]

        result = pd.DataFrame()
        result["cod_municipio"] = df["cod_municipio"].values

        if mun_candidates:
            result["nombre_municipio"] = df[mun_candidates[0]].values

        # IPM total (primera columna IPM disponible o promedio)
        if ipm_total_candidates:
            result["ipm_total"] = pd.to_numeric(df[ipm_total_candidates[0]], errors="coerce")
        elif ipm_candidates:
            # Tomar el primer valor IPM disponible
            vals = df[ipm_candidates[0]].apply(pd.to_numeric, errors="coerce")
            result["ipm_total"] = vals.values
        else:
            # Si no hay columna IPM clara, buscar la primera columna numérica con valores 0-100
            for c in df.columns:
                vals = pd.to_numeric(df[c], errors="coerce")
                if vals.between(0, 100).mean() > 0.7 and vals.notna().sum() > 50:
                    result["ipm_total"] = vals.values
                    print(f"  Usando columna '{c}' como IPM total")
                    break

        if "ipm_total" not in result.columns:
            print("  [ADVERTENCIA] No se pudo extraer columna IPM total.")
            return pd.DataFrame()

        if ipm_cab_candidates:
            result["ipm_cabecera"] = pd.to_numeric(df[ipm_cab_candidates[0]], errors="coerce")
        if ipm_rural_candidates:
            result["ipm_rural"] = pd.to_numeric(df[ipm_rural_candidates[0]], errors="coerce")

        result = result.dropna(subset=["ipm_total"])
        print(f"  [OK] {len(result)} municipios con IPM válido")
        print(f"  Rango IPM: {result['ipm_total'].min():.1f} – {result['ipm_total'].max():.1f}")

        out = PROCESSED_DIR / "ipm_municipios.csv"
        result.to_csv(out, index=False)
        print(f"  [OK] Guardado en {out}")
        return result

    except Exception as e:
        print(f"  [ERROR] al procesar el XLS: {e}")
        import traceback
        traceback.print_exc()
        return pd.DataFrame()


# ─────────────────────────────────────────────────────────
# 2. TEMPERATURA MEDIA IDEAM (datos.gov.co sbwg-7ju4)
# ─────────────────────────────────────────────────────────
IDEAM_API = "https://www.datos.gov.co/resource/sbwg-7ju4.json"
TEMP_CACHE = RAW_DIR / "temperatura_ideam.csv"

# Tabla de equivalencia nombre municipio → código DIVIPOLA
# Se construye desde el CSV UNGRD ya procesado (que tiene cod_municipio y nombre)
# Se complementa con el shapefile procesado


def cargar_tabla_municipios() -> pd.DataFrame:
    """Carga tabla de municipios con código DIVIPOLA y nombre."""
    csv_path = PROCESSED_DIR / "riesgo_municipios.csv"
    if not csv_path.exists():
        print("[ADVERTENCIA] riesgo_municipios.csv no existe. Ejecuta 01_procesar_datos.py primero.")
        return pd.DataFrame()
    df = pd.read_csv(csv_path, dtype={"cod_municipio": str})
    df["nombre_norm"] = df["municipio"].apply(normalizar_texto)
    df["dpto_norm"] = df["departamento"].apply(normalizar_texto)
    return df[["cod_municipio", "municipio", "departamento", "nombre_norm", "dpto_norm"]].drop_duplicates("cod_municipio")


def descargar_temperatura_ideam(tabla_municipios: pd.DataFrame) -> pd.DataFrame:
    """
    Descarga temperatura media del IDEAM para todos los municipios disponibles.
    Agrega temperatura media anual por municipio (promedio 2010-2023).

    Retorna DataFrame con: cod_municipio, temp_media, temp_max_media, n_registros
    """
    if TEMP_CACHE.exists():
        print(f"[OK] Cache temperatura existe: {TEMP_CACHE.name}")
        return pd.read_csv(TEMP_CACHE, dtype={"cod_municipio": str})

    print("Descargando temperatura IDEAM por municipio (esto puede tomar varios minutos)...")
    print("  Dataset: sbwg-7ju4 — Temperatura Ambiente del Aire")

    # La API de Socrata permite agregar directamente con $select y $group
    # Descargamos temperatura media y máxima media por municipio
    url = (
        f"{IDEAM_API}?$select=upper(municipio) as municipio,"
        f"upper(departamento) as departamento,"
        f"avg(valorobservado) as temp_media,"
        f"max(valorobservado) as temp_max,"
        f"count(*) as n_registros"
        f"&$group=upper(municipio),upper(departamento)"
        f"&$limit=2000"
        f"&$order=upper(municipio)"
    )

    try:
        print(f"  Consultando API... (puede tardar 30-60 seg)")
        r = requests.get(url, timeout=120,
                         headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        data = r.json()
        print(f"  Registros recibidos: {len(data)}")
    except Exception as e:
        print(f"  [ERROR] al consultar API IDEAM: {e}")
        return pd.DataFrame()

    df_temp = pd.DataFrame(data)
    if df_temp.empty:
        print("  [ERROR] API IDEAM devolvió datos vacíos.")
        return pd.DataFrame()

    df_temp["temp_media"] = pd.to_numeric(df_temp["temp_media"], errors="coerce")
    df_temp["temp_max"] = pd.to_numeric(df_temp["temp_max"], errors="coerce")
    df_temp["n_registros"] = pd.to_numeric(df_temp["n_registros"], errors="coerce")

    # Filtrar valores físicamente imposibles (temperatura Colombia: -5°C a 45°C)
    df_temp = df_temp[df_temp["temp_media"].between(-5, 45)].copy()

    print(f"  Municipios con datos de temperatura: {len(df_temp)}")
    print(f"  Rango temperatura media: {df_temp['temp_media'].min():.1f} – {df_temp['temp_media'].max():.1f} °C")

    # Join con tabla de municipios para obtener cod_municipio
    if not tabla_municipios.empty:
        df_temp["nombre_norm"] = df_temp["municipio"].apply(normalizar_texto)
        df_temp["dpto_norm"] = df_temp["departamento"].apply(normalizar_texto)

        # Join exacto por nombre + departamento
        merged = df_temp.merge(
            tabla_municipios[["cod_municipio", "nombre_norm", "dpto_norm"]],
            on=["nombre_norm", "dpto_norm"],
            how="left"
        )

        # Para los que no hicieron match, intentar join solo por nombre
        sin_cod = merged[merged["cod_municipio"].isna()].copy()
        if not sin_cod.empty:
            match_nombre = sin_cod.drop(columns=["cod_municipio"]).merge(
                tabla_municipios[["cod_municipio", "nombre_norm"]].drop_duplicates("nombre_norm"),
                on="nombre_norm",
                how="left"
            )
            merged.loc[merged["cod_municipio"].isna(), "cod_municipio"] = match_nombre["cod_municipio"].values

        print(f"  Municipios con código DIVIPOLA asignado: {merged['cod_municipio'].notna().sum()}")
        df_temp = merged
    else:
        df_temp["cod_municipio"] = None

    # Guardar resultado
    cols_out = ["cod_municipio", "municipio", "departamento", "temp_media", "temp_max", "n_registros"]
    cols_out = [c for c in cols_out if c in df_temp.columns]
    df_out = df_temp[cols_out].drop_duplicates("cod_municipio")

    df_out.to_csv(TEMP_CACHE, index=False)
    print(f"  [OK] Guardado en {TEMP_CACHE}")
    return df_out


# ─────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("DESCARGANDO FUENTES ADICIONALES — ÍNDICE TRIANGULADO")
    print("=" * 60)

    print("\n[1/2] IPM Censal 2018 (DANE)...")
    df_ipm = descargar_ipm_dane()
    if df_ipm.empty:
        print("  [OMITIDO] IPM no disponible. Se continuará sin él.")
    else:
        print(f"  Resumen IPM: {len(df_ipm)} municipios")
        print(f"  Top 5 mayor IPM:")
        print(df_ipm.nlargest(5, "ipm_total")[["cod_municipio", "ipm_total"]].to_string(index=False))

    print("\n[2/2] Temperatura media IDEAM...")
    tabla_mun = cargar_tabla_municipios()
    df_temp = descargar_temperatura_ideam(tabla_mun)
    if df_temp.empty:
        print("  [OMITIDO] Temperatura no disponible.")
    else:
        print(f"  Resumen temperatura: {len(df_temp)} municipios")
        print(f"  Top 5 mayor temperatura media:")
        top = df_temp.dropna(subset=["temp_media"]).nlargest(5, "temp_media")
        print(top[["municipio", "departamento", "temp_media"]].to_string(index=False))

    print("\n[OK] Descarga completada. Ejecuta 01_procesar_datos.py para regenerar el GeoJSON.")


if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    main()
