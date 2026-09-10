/** Reading multi‑GB files into ArrayBuffer often crashes the tab before we can subsample. */
export const MAX_FILE_BYTES = 450 * 1024 * 1024
const NETCDF_EXTENSION = /\.(nc|nc4|netcdf)$/i

export function parseNetcdfUrl(rawUrl) {
  const trimmed = String(rawUrl ?? '').trim()
  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('Enter a valid http(s) URL that points to a .nc, .nc4, or .netcdf file.')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.')
  }
  if (!NETCDF_EXTENSION.test(parsed.pathname)) {
    throw new Error('That URL doesn’t look like a NetCDF file. Use a link ending in .nc, .nc4, or .netcdf.')
  }
  return parsed
}

export function fileNameFromUrl(parsedUrl) {
  const name = decodeURIComponent(parsedUrl.pathname.split('/').filter(Boolean).pop() || '')
  return NETCDF_EXTENSION.test(name) ? name : 'dataset.nc'
}

export function fileTooLargeMessage(bytes) {
  return (
    `This file is about ${(bytes / (1024 * 1024)).toFixed(0)} MB. ` +
    'Loading very large NetCDF files in the browser often crashes the tab. ' +
    'Try a smaller file, a single timestep, or crop the domain in another tool first.'
  )
}

export async function fetchNetcdfFile(rawUrl) {
  const parsed = parseNetcdfUrl(rawUrl)
  let response
  try {
    response = await fetch(parsed.href)
  } catch {
    throw new Error(
      'Couldn’t download that URL. The host may block browser requests (CORS), or the link may be unreachable.'
    )
  }
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`)
  }

  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES) {
    throw new Error(fileTooLargeMessage(contentLength))
  }

  const blob = await response.blob()
  return new File([blob], fileNameFromUrl(parsed), { type: blob.type || 'application/x-netcdf' })
}
