import { useEffect, useRef, useState } from 'react'
import { Check, CloudUpload, WifiOff } from 'lucide-react'
import { flushPendingAttendance, getPendingAttendance, useOnlineStatus, usePendingCount } from '../../lib/sync'

// Indicador global de conexión: muestra un badge cuando la app está sin
// conexión (operando en modo local) y un destello al sincronizar la cola
// de asistencias cuando se recupera la conexión.
export function ConnectionBadge() {
  const online = useOnlineStatus()
  const pending = usePendingCount()
  const [justSynced, setJustSynced] = useState(false)
  const wasOffline = useRef(false)

  // Al arrancar con registros pendientes y conexión activa, se sincroniza en silencio.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine && getPendingAttendance().length > 0) {
      flushPendingAttendance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al recuperar la conexión: sincronizar la cola y mostrar confirmación.
  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      return
    }
    if (wasOffline.current) {
      wasOffline.current = false
      flushPendingAttendance().then((count) => {
        if (count > 0) {
          setJustSynced(true)
          setTimeout(() => setJustSynced(false), 3000)
        }
      })
    }
  }, [online])

  if (online && !justSynced) return null

  return (
    <div className="fixed bottom-4 left-4 z-[70] flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800/95 px-3 py-2 text-xs font-medium text-fog shadow-lg shadow-black/40 backdrop-blur">
      {online ? (
        <>
          <Check className="size-4 text-ok" aria-hidden />
          <span>Sincronizado</span>
        </>
      ) : (
        <>
          <WifiOff className="size-4 text-warn" aria-hidden />
          <span>
            Sin conexión · operando en modo local
            {pending > 0 && (
              <span className="text-warn">
                {' '}
                · <CloudUpload className="inline size-3.5 -mt-0.5" aria-hidden /> {pending} pendiente{pending === 1 ? '' : 's'}
              </span>
            )}
          </span>
        </>
      )}
    </div>
  )
}