/** Natural Earth 110m admin-1 (states/provinces); filtered in the map style to USA, CAN, MEX. */
export const NA_ADMIN1_SOURCE_ID = 'na-admin1'
export const NA_STATE_LAYER_ID = 'na-state-borders'

export const NATURAL_EARTH_ADMIN1_GEOJSON =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_1_states_provinces.geojson'

/** Natural Earth attribution (required when displaying this dataset). */
export const NATURAL_EARTH_ATTRIBUTION = 'State/province boundaries: Natural Earth'

/** MapLibre filter: first-order admin units in the US, Canada, and Mexico. */
export const NA_ADMIN1_FILTER = [
  'in',
  ['get', 'adm0_a3'],
  ['literal', ['USA', 'CAN', 'MEX']],
]
