'use client'

import { useState } from 'react'
import { CalendarPlus, ChevronDown, ExternalLink, Download } from 'lucide-react'

interface Props {
  title: string
  description: string
  startsAt: string
  endsAt?: string | null
  address: string
  city: string
  eventId: string
}

function formatICSDate(iso: string) {
  return iso.replace(/[-:]/g, '').replace('.000Z', 'Z').split('.')[0] + 'Z'
}

export function AddToCalendar({ title, description, startsAt, endsAt, address, city, eventId }: Props) {
  const [open, setOpen] = useState(false)

  const location = `${address}, ${city}`
  const start = formatICSDate(startsAt)
  const end = endsAt ? formatICSDate(endsAt) : formatICSDate(new Date(new Date(startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString())
  const url = `${window.location.origin}/e/${eventId}`

  function googleCalendarUrl() {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${start}/${end}`,
      details: `${description}\n\n${url}`,
      location,
    })
    return `https://calendar.google.com/calendar/render?${params}`
  }

  function downloadICS() {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TáNaLista//PT',
      'BEGIN:VEVENT',
      `UID:${eventId}@tanalista.com.br`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}\\n\\n${url}`,
      `LOCATION:${location}`,
      `URL:${url}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`
    a.click()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/60 hover:text-primary hover:border-primary/30 hover:bg-primary/8 transition-colors"
      >
        <CalendarPlus className="size-3.5" />
        Adicionar ao calendário
        <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 bg-[#1A2E22] border border-white/10 rounded-xl shadow-xl min-w-[180px] py-1 overflow-hidden">
            <a
              href={googleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              Google Calendar
            </a>
            <button
              onClick={() => { downloadICS(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Download className="size-3.5 shrink-0" />
              Baixar .ics
            </button>
          </div>
        </>
      )}
    </div>
  )
}
