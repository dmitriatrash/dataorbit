import { useCallback, useId, useRef, useState } from 'react'
import { Button, Spinner } from '@heroui/react'
import { parseNetcdfUrl } from './netcdfUrl'

export default function UploadPanel({ status, meta, error, parsingFileName, onFile, onVariableChange, onReset }) {
  const inputId = useId()
  const urlFieldId = useId()
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState(null)

  const acceptFile = useCallback((file) => {
    if (file) onFile(file)
  }, [onFile])

  const submitUrl = useCallback((raw) => {
    const value = String(raw ?? '').trim()
    setUrl(value)
    if (!value) {
      setUrlError('Paste a URL to a .nc, .nc4, or .netcdf file.')
      return
    }
    try {
      parseNetcdfUrl(value)
      setUrlError(null)
      onFile(value)
    } catch (err) {
      setUrlError(err.message)
    }
  }, [onFile])

  const handleInput = useCallback((event) => {
    acceptFile(event.target.files?.[0])
    event.target.value = ''
  }, [acceptFile])

  const handleDrop = useCallback((event) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      acceptFile(file)
      return
    }
    const uri = (event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain'))
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#') && /^https?:\/\//i.test(line))
    if (uri) submitUrl(uri)
  }, [acceptFile, submitUrl])

  const handlePaste = useCallback((event) => {
    const text = event.clipboardData?.getData('text/plain')?.trim()
    if (!text || !/^https?:\/\//i.test(text)) return
    event.preventDefault()
    submitUrl(text)
  }, [submitUrl])

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const urlField = (
    <DatasetUrlField
      id={urlFieldId}
      url={url}
      error={urlError}
      onChange={(value) => {
        setUrl(value)
        if (urlError) setUrlError(null)
      }}
      onSubmit={submitUrl}
      onPaste={handlePaste}
    />
  )

  const fileInput = (
    <input
      ref={inputRef}
      id={inputId}
      className="dataorbit-file-input"
      type="file"
      accept=".nc,.nc4,.netcdf"
      onChange={handleInput}
    />
  )

  if (status === 'ready' && meta) {
    return (
      <div className="dataset-panel dataset-panel--ready">
        <div className="dataset-file-row">
          <span className="dataset-file-row__label">Loaded file</span>
          <Button size="sm" variant="light" onPress={onReset} className="drawer-quiet-button">Replace</Button>
        </div>
        <p className="dataset-file-name" title={meta.fileName}>{meta.fileName}</p>
        {meta.availableVariables?.length > 1 ? (
          <div className="dataset-variable-field">
            <label htmlFor="dataset-variable">{meta.variableKind === 'channel' ? 'Satellite channel' : 'Variable'}</label>
            <select id="dataset-variable" value={meta.varName} onChange={(event) => onVariableChange?.(event.target.value)}>
              {meta.availableVariables.map((variable) => (
                <option key={variable.name} value={variable.name}>
                  {variable.name}{variable.units && variable.units !== '—' ? ` · ${variable.units}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <dl className="dataset-readout">
          <Readout label="Variable" value={meta.varName} />
          <Readout label="Units" value={meta.units} />
          <Readout label="Source range" value={`${formatValue(meta.minValue)} — ${formatValue(meta.maxValue)}`} accent />
          <Readout label="Points" value={meta.subsampled ? `${meta.pointCount.toLocaleString()} / ${meta.gridCellCount?.toLocaleString() ?? '—'}` : meta.pointCount.toLocaleString()} />
        </dl>
        {meta.layerMode === 'grid' && meta.gridSize ? (
          <p className="dataset-note dataset-note--success">Model grid {meta.gridSize.ny} × {meta.gridSize.nx}. Heatmap uses cell-centered samples.</p>
        ) : null}
        {meta.subsampled && meta.gridCellCount != null && meta.subsampleStride != null ? (
          <p className="dataset-note dataset-note--warning">A {meta.subsampleStride}-cell stride keeps rendering within the {meta.maxHeatmapFeatures?.toLocaleString() ?? 'current'} point budget.</p>
        ) : null}
      </div>
    )
  }

  if (status === 'parsing') {
    return (
      <div className="dataset-state dataset-state--parsing" role="status" aria-live="polite" aria-busy="true">
        <Spinner size="sm" color="warning" />
        <div>
          <strong>Reading variables and sampling the grid.</strong>
          {parsingFileName ? <p title={parsingFileName}>{parsingFileName}</p> : null}
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="dataset-state dataset-state--error" role="alert">
        <p className="dataset-state__error-title">Couldn’t read file</p>
        <p className="dataset-state__error-copy">{error}</p>
        <div className="dataset-state__actions">
          <Button size="sm" color="danger" variant="flat" onPress={openPicker}>Choose another file</Button>
          <Button size="sm" variant="light" onPress={onReset} className="drawer-quiet-button">Clear</Button>
        </div>
        {fileInput}
        {urlField}
      </div>
    )
  }

  return (
    <div className="dataset-state dataset-state--idle">
      {fileInput}
      <label
        htmlFor={inputId}
        className={`dataset-dropzone ${isDragging ? 'is-dragging' : ''}`}
        onDrop={handleDrop}
        onDragEnter={() => setIsDragging(true)}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false)
        }}
      >
        <i className="ti ti-file-upload" aria-hidden="true" />
        <span>Drop a NetCDF file</span>
        <small>.nc · .nc4 · .netcdf</small>
      </label>
      <Button fullWidth color="warning" variant="solid" onPress={openPicker} className="drawer-primary-button">Choose file</Button>
      <div className="dataset-or" role="separator" aria-label="or">or</div>
      {urlField}
      <p className="dataset-helper">Expected latitude/longitude coordinates and a numeric field.</p>
    </div>
  )
}

function DatasetUrlField({ id, url, error, onChange, onSubmit, onPaste }) {
  return (
    <div className="dataset-url">
      <label htmlFor={id}>Paste a file URL</label>
      <div className="dataset-url__row">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck="false"
          placeholder="https://example.com/grid.nc"
          value={url}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmit(event.currentTarget.value)
            }
          }}
        />
        <Button variant="light" onPress={() => onSubmit(url)} className="drawer-secondary-button">Load</Button>
      </div>
      {error ? <p id={`${id}-error`} className="dataset-url__error">{error}</p> : null}
    </div>
  )
}

function Readout({ label, value, accent = false }) {
  return (
    <div className="dataset-readout__item">
      <dt>{label}</dt>
      <dd className={accent ? 'is-accent' : ''}>{value}</dd>
    </div>
  )
}

function formatValue(value) {
  if (!Number.isFinite(value)) return '—'
  const absolute = Math.abs(value)
  if ((absolute > 0 && absolute < 0.001) || absolute >= 100000) return value.toExponential(3)
  return value.toPrecision(5)
}
