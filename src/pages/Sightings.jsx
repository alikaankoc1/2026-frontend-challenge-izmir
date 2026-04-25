import { useEffect, useMemo, useState } from 'react'
import { FORM_IDS, getSubmissions } from '../services/jotformService'

// Normalize Sightings form answers into a simple list row.
function mapSightingAnswerToRow(answers, index) {
  const answerList = Object.values(answers ?? {})
  const byFieldName = Object.fromEntries(
    answerList.map((item) => [String(item?.text ?? '').toLowerCase(), item]),
  )

  return {
    id: index + 1,
    location: String(byFieldName.location?.answer ?? 'Unknown'),
    coordinates: String(byFieldName.coordinates?.answer ?? ''),
    timestamp: String(byFieldName.timestamp?.answer ?? 'Unknown'),
    note: String(byFieldName.note?.answer ?? '-'),
  }
}

// Parse "lat,lng" text into numeric coordinates.
function parseCoordinates(value) {
  const [latRaw, lngRaw] = String(value ?? '')
    .split(',')
    .map((item) => item.trim())
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng }
}

// Parse "dd-mm-yyyy hh:mm" timestamps for reliable sorting.
function parseSightingDate(value) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, day, month, year, hour, minute] = match
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
}

// Render a dedicated Sightings page with real Jotform data.
function Sightings({ searchTerm = '' }) {
  const [sightings, setSightings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch sightings records from the SIGHTINGS form.
    const loadSightings = async () => {
      try {
        const answers = await getSubmissions(FORM_IDS.SIGHTINGS)
        setSightings(answers.map(mapSightingAnswerToRow))
      } catch (requestError) {
        setError('Failed to load sightings records.')
        console.error('Sightings request failed:', requestError)
      } finally {
        setLoading(false)
      }
    }

    loadSightings()
  }, [])

  // Apply global text filtering across location, time, and note fields.
  const visibleSightings = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR')
    if (!query) return sightings

    return sightings.filter((item) =>
      [item.location, item.timestamp, item.note]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(query),
    )
  }, [sightings, searchTerm])

  // Sort sightings by latest timestamp first.
  const sortedSightings = useMemo(
    () =>
      [...visibleSightings].sort((a, b) => {
        const left = parseSightingDate(a.timestamp)?.getTime() ?? 0
        const right = parseSightingDate(b.timestamp)?.getTime() ?? 0
        return right - left
      }),
    [visibleSightings],
  )

  // Keep only sorted sightings that have valid coordinates.
  const sightingsWithCoords = useMemo(
    () =>
      sortedSightings
        .map((item) => ({ ...item, parsedCoords: parseCoordinates(item.coordinates) }))
        .filter((item) => item.parsedCoords),
    [sortedSightings],
  )

  // Use latest available coordinates as the preview map target.
  const previewCoords = sightingsWithCoords[0]?.parsedCoords
  const mapEmbedUrl = previewCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${previewCoords.lng - 0.01}%2C${previewCoords.lat - 0.01}%2C${previewCoords.lng + 0.01}%2C${previewCoords.lat + 0.01}&layer=mapnik&marker=${previewCoords.lat}%2C${previewCoords.lng}`
    : ''

  if (loading) {
    return (
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <p className="text-emerald-300">Loading sightings...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-xl border border-rose-500/30 bg-slate-900/80 p-6 shadow-xl shadow-black/40">
        <p className="text-rose-300">{error}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-emerald-400/25 bg-slate-900/80 p-6 shadow-2xl shadow-black/50">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-semibold text-emerald-300">Sightings</h2>
        <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm text-amber-200">
          Total: {visibleSightings.length}
        </span>
      </div>

      {visibleSightings.length === 0 ? (
        <p className="text-slate-300">No sightings records found yet.</p>
      ) : (
        <div className="space-y-4">
          {previewCoords && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="mb-2 text-xs uppercase tracking-wider text-cyan-300">
                Last Seen Location Map
              </p>
              {/* Embed a quick map preview for the latest coordinate. */}
              <iframe
                title="Last seen map"
                src={mapEmbedUrl}
                className="h-56 w-full rounded border border-slate-700"
                loading="lazy"
              />
            </div>
          )}

          <ul className="space-y-3">
            {sortedSightings.map((item) => {
              const parsed = parseCoordinates(item.coordinates)
              const mapsUrl = parsed
                ? `https://www.openstreetmap.org/?mlat=${parsed.lat}&mlon=${parsed.lng}#map=16/${parsed.lat}/${parsed.lng}`
                : null

              return (
                <li key={item.id} className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
                  <p className="text-sm text-slate-300">
                    <span className="text-slate-400">Görüldüğü Yer:</span> {item.location}
                  </p>
                  <p className="mt-1 text-sm text-emerald-300">
                    <span className="text-slate-400">Zaman:</span> {item.timestamp}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    <span className="text-slate-400">Tanım / Not:</span> {item.note}
                  </p>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200"
                    >
                      Open location on map
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

export default Sightings
