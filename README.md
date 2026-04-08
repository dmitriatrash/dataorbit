# RRFS-A Smoke Globe

An interactive 3D globe visualization of NOAA RRFS-A vertically integrated smoke (column mass density) data, built with React, HeroUI v3, MapLibre GL, and Tailwind CSS 4.

## Features

- **Upload any NetCDF file** — drag & drop or click to browse; the app auto-detects the COLMD smoke variable, parses it client-side (no server needed), and streams it onto the globe
- **Interactive globe** — pan, zoom, tilt via MapLibre GL's `globe` projection
- **NOAA colormap** — exact color ramp extracted from official RRFS product imagery (mg m⁻²)
- **Live controls** — smoothing radius, intensity, opacity, and boundary opacity sliders update the heatmap instantly
- **Prominent boundaries** — country borders (white) and state/province borders (dashed blue) rendered on top of the smoke layer via OpenMapTiles vector tiles

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI framework |
| HeroUI | 3 | Component library |
| Tailwind CSS | 4 | Styling |
| MapLibre GL | 4 | Globe rendering |
| netcdfjs | latest | Client-side NetCDF parsing |
| Vite | 8 | Build tool |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), drop in a NetCDF file (e.g. `rrfs_t00z_prslev_3km_f020_na.nc`), and the smoke layer will render automatically.

## NetCDF File Format

The app expects a NetCDF file with:
- A `COLMD_*` variable (column-integrated mass density, kg m⁻²) — or any variable matching `smoke` / `mass`
- `gridlat_0` / `gridlon_0` coordinate arrays (or `lat` / `lon`)

Tested against RRFS-A 3km North America domain files (NCEP production).
