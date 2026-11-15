import { Navigation } from 'lucide-react'

interface EventLocationMapProps {
  address: string
  city: string
}

// Embed sem chave de API (não temos NEXT_PUBLIC_GOOGLE_MAPS_API_KEY configurada) —
// o parâmetro output=embed do Maps clássico funciona sem autenticação.
export function EventLocationMap({ address, city }: EventLocationMapProps) {
  const query = `${address}, ${city}`
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Como chegar</h3>
      <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
        <iframe
          src={embedSrc}
          width="100%"
          height="180"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Mapa: ${query}`}
        />
      </div>
      <a
        href={mapsSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors"
      >
        <Navigation className="size-3.5" />
        Abrir no Google Maps
      </a>
    </div>
  )
}
